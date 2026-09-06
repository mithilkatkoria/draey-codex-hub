pub mod model;
pub mod storage;
pub mod usage;
pub mod codex;
pub mod workspace;
pub mod desktop;
use model::*;
use std::{collections::HashMap,path::PathBuf,sync::{Arc,Mutex}};
use tauri::{Emitter,Manager,State};
use serde_json::{json,Value};

pub struct Hub {path:PathBuf,store:Mutex<Store>,operations:Mutex<HashMap<String,Arc<tokio::sync::Mutex<()>>>>,logins:Mutex<HashMap<String,Arc<tokio::sync::Notify>>>,workspace_gate:tokio::sync::RwLock<()>,pending_switch:Mutex<Option<Value>>,switch_cancel:Mutex<Option<Arc<tokio::sync::Notify>>>}
impl Hub {
 fn read(&self)->Store {self.store.lock().unwrap_or_else(|e|e.into_inner()).clone()}
 fn update<T>(&self,f:impl FnOnce(&mut Store)->Result<T,String>)->Result<T,String> {let mut guard=self.store.lock().map_err(|_|"Hub state unavailable")?;let mut next=guard.clone();let result=f(&mut next)?;storage::save(&self.path,&next)?;*guard=next;Ok(result)}
 fn profile(&self,id:&str)->Result<Profile,String>{self.read().profiles.into_iter().find(|p|p.id==id).ok_or("Profile no longer exists.".into())}
 fn operation(&self,id:&str)->Arc<tokio::sync::Mutex<()>>{self.operations.lock().unwrap().entry(id.into()).or_default().clone()}
 fn root(&self)->PathBuf {self.read().settings.profile_root.unwrap_or_else(||self.path.parent().unwrap().join("profiles"))}
}
#[tauri::command] fn load_state(hub:State<Hub>)->Store {hub.read()}
#[tauri::command] async fn detect_codex(hub:State<'_,Hub>)->Result<codex::Installation,String>{let settings=hub.read().settings;tauri::async_runtime::spawn_blocking(move||codex::detect(&settings)).await.map_err(|_|"Detection failed".into())}
#[tauri::command] async fn choose_path(kind:String)->Option<String>{tauri::async_runtime::spawn_blocking(move||{let dialog=rfd::FileDialog::new();let path=if kind=="exe" {dialog.add_filter("Windows executable",&["exe"]).pick_file()}else{dialog.pick_folder()};path.map(|p|p.to_string_lossy().into_owned())}).await.ok().flatten()}
#[derive(serde::Deserialize)] #[serde(rename_all="camelCase")]
struct ProfileInput {id:Option<String>,name:String,plan:String,accent:String,availability:String,existing_home:Option<PathBuf>}
#[tauri::command] fn save_profile(app:tauri::AppHandle,hub:State<Hub>,input:ProfileInput)->Result<Profile,String>{
 let name=name(&input.name)?;
 if !["plus","pro","other"].contains(&input.plan.as_str())||!["available","reserved","friend-priority"].contains(&input.availability.as_str())||!["blue","violet","mint","amber","rose"].contains(&input.accent.as_str()){return Err("Invalid profile preference".into())}
 let profile=if let Some(id)=input.id {let mut p=hub.profile(&id)?;p.name=name;p.plan=input.plan;p.accent=input.accent;p.availability=input.availability;p}else{
  let id=uuid::Uuid::new_v4().to_string();let base=hub.root().join(&id);let source=input.existing_home.as_ref().map(|p|directory(p)).transpose()?;let managed=true;let home=base.join("home");
  if hub.read().profiles.iter().any(|p|p.home==home){return Err("This Codex home is already in the Hub.".into())}
  std::fs::create_dir_all(base.join("desktop")).map_err(|_|"Cannot create isolated profile storage")?;
  if managed {std::fs::create_dir_all(&home).map_err(|_|"Cannot create Codex home")?;std::fs::write(home.join("config.toml"),"# Authentication is managed by Codex in this isolated home.\ncli_auth_credentials_store = \"file\"\n").map_err(|_|"Cannot initialize profile configuration")?;if let Some(source)=source {workspace::import_account(&source,&home)?;}}
  Profile{id,name,plan:input.plan,accent:input.accent,availability:input.availability,home,desktop_data:base.join("desktop"),managed,created_at:now(),last_used_at:None,connection:"auth-required".into(),identity_key:None,account_email:None,actual_plan:None}
 };
 hub.update(|s|{s.profiles.retain(|p|p.id!=profile.id);s.profiles.push(profile.clone());Ok(())})?;update_tray(&app);Ok(profile)
}
#[tauri::command] async fn remove_profile(app:tauri::AppHandle,hub:State<'_,Hub>,id:String,delete_data:bool,confirmation:String)->Result<(),String>{
 let op=hub.operation(&id);let _guard=op.try_lock().map_err(|_|"Wait for this profile's current operation to finish.")?;
 let p=hub.profile(&id)?;if confirmation!=p.name {return Err("Type the exact profile name to confirm removal.".into())}
 if delete_data {return Err("Automatic profile-data deletion is deliberately unavailable in this release. Remove the profile from the Hub, then manage its files in Explorer.".into())}
 hub.update(|s|{s.profiles.retain(|p|p.id!=id);s.usage_cache.remove(&id);for project in &mut s.projects {if project.preferred_profile_id.as_deref()==Some(&id){project.preferred_profile_id=None}}Ok(())})?;update_tray(&app);Ok(())
}
#[tauri::command] fn save_project(hub:State<Hub>,mut project:Project)->Result<Project,String>{project.name=name(&project.name)?;project.path=directory(&project.path)?;if project.id.is_empty(){project.id=uuid::Uuid::new_v4().to_string();}hub.update(|s|{if let Some(id)=&project.preferred_profile_id {if !s.profiles.iter().any(|p|&p.id==id){return Err("Preferred profile does not exist.".into())}}s.projects.retain(|p|p.id!=project.id);s.projects.push(project.clone());Ok(project)})}
#[tauri::command] fn remove_project(hub:State<Hub>,id:String)->Result<(),String>{hub.update(|s|{s.projects.retain(|p|p.id!=id);Ok(())})}
#[tauri::command] fn save_settings(hub:State<Hub>,settings:Settings)->Result<Settings,String>{
 if !(30..=3600).contains(&settings.refresh_seconds){return Err("Choose a refresh interval between 30 and 3600 seconds.".into())}
 for p in [&settings.desktop_exe,&settings.cli_exe].into_iter().flatten(){if !p.is_absolute()||!p.is_file()||!p.extension().is_some_and(|x|x.eq_ignore_ascii_case("exe")){return Err("Choose an existing .exe file.".into())}}
 if let Some(p)=&settings.profile_root {directory(p)?;}
 let previous=hub.read().settings;
 set_startup(settings.startup)?;
 match hub.update(|s|{s.settings=settings.clone();Ok(settings)}){Ok(s)=>Ok(s),Err(e)=>{let _=set_startup(previous.startup);Err(e)}}
}
fn set_startup(enabled:bool)->Result<(),String>{
 #[cfg(windows)] {use winreg::{RegKey,enums::*};let key=RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags("Software\\Microsoft\\Windows\\CurrentVersion\\Run",KEY_SET_VALUE).map_err(|_|"Cannot update Windows startup preference")?;if enabled {let exe=std::env::current_exe().map_err(|_|"Cannot locate Hub executable")?;key.set_value("DraeyCodexHub",&format!("\"{}\" --background",exe.display())).map_err(|_|"Cannot enable Windows startup")?;}else{match key.delete_value("DraeyCodexHub"){Ok(())=>{},Err(e) if e.kind()==std::io::ErrorKind::NotFound=>{},Err(_)=>return Err("Cannot disable Windows startup".into())}} }
 Ok(())
}
async fn refresh(app:&tauri::AppHandle,id:String)->Result<Snapshot,String>{
 let hub=app.state::<Hub>();let _workspace_guard=hub.workspace_gate.read().await;let op=hub.operation(&id);let _guard=op.try_lock().map_err(|_|"Profile is busy connecting or launching. Try again shortly.")?;let p=hub.profile(&id)?;
 let cli=codex::detect(&hub.read().settings).cli.ok_or("Codex CLI was not found. Locate it in Settings.")?;
 let result=async {let home=workspace::usage_home(&p,&workspace::shared_home()?)?;let mut rpc=codex::Rpc::start(&cli,&home).await?;let account=rpc.account().await?;let key=codex::identity_key(&account)?;if p.identity_key.as_ref().is_some_and(|expected|expected!=&key){return Err("AUTH_REQUIRED: This folder now contains a different account. Reconnect deliberately before using it.".into())}let value=rpc.call("account/rateLimits/read",json!({})).await?;let snapshot=usage::parse(&value)?;rpc.stop().await;workspace::sync_active_slot(&p,&home)?;hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.identity_key=Some(key);p.account_email=account.get("email").and_then(Value::as_str).map(String::from);p.actual_plan=account.get("planType").and_then(Value::as_str).map(String::from);}Ok(())})?;Ok::<_,String>(snapshot)}.await;
 let snapshot=match result {Ok(snapshot)=>{hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.connection="connected".into();s.usage_cache.insert(id.clone(),snapshot.clone());}Ok(())})?;snapshot},Err(message)=>{let state=if message.starts_with("AUTH_REQUIRED") {"auth-required"}else if message.starts_with("OFFLINE") {"offline"}else {"unavailable"};let mut snapshot=hub.read().usage_cache.get(&id).cloned().unwrap_or(Snapshot{windows:vec![],fetched_at:String::new(),source:"Codex app-server".into(),state:state.into(),message:None,reset_credits:None});snapshot.state=state.into();snapshot.message=Some(message);if state=="auth-required" {hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.connection="auth-required".into();}Ok(())})?;}snapshot}};
 let _=app.emit("usage-updated",json!({"id":id,"snapshot":snapshot}));if let Ok(profile)=hub.profile(&id){let _=app.emit("profile-updated",profile);}update_tray(app);Ok(snapshot)
}
#[tauri::command] async fn refresh_usage(app:tauri::AppHandle,id:String)->Result<Snapshot,String>{refresh(&app,id).await}
#[tauri::command] async fn login_profile(app:tauri::AppHandle,id:String)->Result<(),String>{
 let hub=app.state::<Hub>();let _workspace_guard=hub.workspace_gate.read().await;let op=hub.operation(&id);let _guard=op.try_lock().map_err(|_|"This profile already has an operation running.")?;
 // Codex's browser callback listener can be shared across homes; serialize interactive login only.
 let auth_op=hub.operation("__interactive_login");let _auth_guard=auth_op.try_lock().map_err(|_|"Finish or cancel the other profile's sign-in first.")?;
 let p=hub.profile(&id)?;if workspace::is_active(&p,&workspace::shared_home()?)? {return Err("This account is active in your existing Codex workspace. Reconnect from Codex, or switch to another saved account first.".into());}let cli=codex::detect(&hub.read().settings).cli.ok_or("Codex CLI is missing. Locate it in Settings.")?;
 let cancel=Arc::new(tokio::sync::Notify::new());hub.logins.lock().unwrap().insert(id.clone(),cancel.clone());
 let result=async {
  let mut rpc=codex::Rpc::start(&cli,&p.home).await?;
  let response=rpc.call("account/login/start",json!({"type":"chatgpt"})).await?;
  let url=response.get("authUrl").and_then(Value::as_str).ok_or("Codex did not return a sign-in address")?;
  let parsed=tauri::Url::parse(url).map_err(|_|"Invalid OpenAI sign-in address")?;
  if parsed.scheme()!="https"||!matches!(parsed.host_str(),Some("auth.openai.com"|"chatgpt.com")){return Err("Codex returned an unexpected sign-in host.".into())}
  open::that(url).map_err(|_|"Could not open your default browser for OpenAI sign-in")?;
  let _=app.emit("login-progress",json!({"id":id,"message":"Complete OpenAI sign-in in your browser"}));
  tokio::select! {
   _=cancel.notified()=>{rpc.stop().await;Err("Sign-in cancelled.".into())},
   result=tokio::time::timeout(std::time::Duration::from_secs(600),async {loop {let v=rpc.next().await?;if v.get("method").and_then(Value::as_str)==Some("account/login/completed") {if v["params"]["success"].as_bool()!=Some(true){return Err("OpenAI sign-in was not completed. Please reconnect.".into())}let account=rpc.account().await?;let key=codex::identity_key(&account)?;hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.identity_key=Some(key);p.account_email=account.get("email").and_then(Value::as_str).map(String::from);p.actual_plan=account.get("planType").and_then(Value::as_str).map(String::from);}s.usage_cache.remove(&id);Ok(())})?;return Ok(())}}})=>{rpc.stop().await;result.map_err(|_|"Sign-in timed out. Please reconnect.".to_string())?}
  }
 }.await;
 hub.logins.lock().unwrap().remove(&id);
 if result.is_ok(){hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.connection="connected".into();}Ok(())})?;}
 result
}
#[tauri::command] fn cancel_login(hub:State<Hub>,id:String){if let Some(n)=hub.logins.lock().unwrap().get(&id){n.notify_one();}}
fn switch_progress(app:&tauri::AppHandle,id:&str,stage:&str,message:&str) {
 let hub=app.state::<Hub>();
 let value=json!({"id":id,"stage":stage,"message":message});
 *hub.pending_switch.lock().unwrap()=Some(value.clone());
 let _=app.emit("workspace-switch",Some(value));
 let _=app.emit("launch-progress",json!({"id":id,"message":if stage=="waiting" {"Sign out in Codex to continue…"}else{message}}));
 show(app);
}
#[tauri::command] fn workspace_status(hub:State<Hub>)->Result<Value,String> {
 let home=workspace::shared_home()?;
 let active=hub.read().profiles.into_iter().find(|p|workspace::is_active(p,&home).unwrap_or(false)).map(|p|p.id);
 Ok(json!({"home":home,"activeProfileId":active,"pending":hub.pending_switch.lock().unwrap().clone()}))
}
#[tauri::command] fn cancel_switch(hub:State<Hub>) {
 if let Some(cancel)=hub.switch_cancel.lock().unwrap().as_ref(){cancel.notify_one();}
}
#[tauri::command] async fn launch_profile(app:tauri::AppHandle,id:String,project_id:Option<String>)->Result<String,String>{
 let hub=app.state::<Hub>();
 let switch=hub.operation("__workspace_launch");
 let _launch_guard=switch.try_lock().map_err(|_|"An account switch is already pending. Finish or cancel it first.")?;
 let cancel=Arc::new(tokio::sync::Notify::new());
 *hub.switch_cancel.lock().unwrap()=Some(cancel.clone());
 let result=launch_in_workspace(&app,&id,project_id,&cancel).await;
 *hub.pending_switch.lock().unwrap()=None;
 *hub.switch_cancel.lock().unwrap()=None;
 let _=app.emit("workspace-switch",Option::<Value>::None);
 let _=app.emit("launch-progress",json!({"id":id,"message":""}));
 result
}
async fn launch_in_workspace(app:&tauri::AppHandle,id:&str,project_id:Option<String>,cancel:&tokio::sync::Notify)->Result<String,String> {
 let hub=app.state::<Hub>();let home=workspace::shared_home()?;
 workspace::ensure_file_store(&home)?;
 let p=hub.profile(id)?;
 if workspace::Auth::read(&p.home)?.is_none(){return Err("Connect this account first.".into());}
 let install=codex::detect(&hub.read().settings);
 let exe=install.desktop.ok_or("Codex Desktop was not found. Locate it in Settings.")?;
 let cli=install.cli.ok_or("Codex CLI is needed to verify the selected account.")?;
 if !workspace::is_active(&p,&home)? && desktop::running(&exe) {
  switch_progress(app,id,"waiting",&format!("To use {}, sign out inside Codex. Keep the Hub open: it will detect sign-out, request a normal restart, and use this saved login in your existing workspace. You can also quit Codex to continue.",p.name));
  let wait=async {
   while desktop::running(&exe) {
    if workspace::signed_out(&home)? {return Ok::<(),String>(());}
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
   }
   Ok(())
  };
  tokio::select! {
   _=cancel.notified()=>return Err("Account switch cancelled. Your workspace is unchanged.".into()),
   result=tokio::time::timeout(std::time::Duration::from_secs(600),wait)=>{result.map_err(|_|"Account switch expired. Sign out in Codex or quit it, then select the saved account again. Nothing was changed.")??;}
  }
 }
 // Short exclusive section: wait for independent refresh/login operations to finish.
 let _workspace_guard=tokio::select! {
  _=cancel.notified()=>return Err("Account switch cancelled. Your workspace is unchanged.".into()),
  guard=hub.workspace_gate.write()=>guard,
 };
 let op=hub.operation(id);let _guard=op.lock().await;
 let p=hub.profile(id)?;let store=hub.read();
 let project=match project_id.as_ref(){Some(id)=>Some(store.projects.iter().find(|p|&p.id==id).ok_or("Project no longer exists")?),None=>None};
 if let Some(p)=project{directory(&p.path)?;}
 let active=workspace::is_active(&p,&home)?;
 if !active && desktop::running(&exe) && !workspace::signed_out(&home)?{return Err("Codex is signed in again. Sign out or quit Codex, then select the saved account. Nothing was changed.".into());}
 switch_progress(app,id,"switching","Verifying the selected account…");
 let source=workspace::usage_home(&p,&home)?;
 let mut rpc=codex::Rpc::start(&cli,&source).await?;
 let key=codex::identity_key(&rpc.account().await?)?;rpc.stop().await;
 if p.identity_key.as_ref()!=Some(&key){return Err("The saved account identity could not be verified. Reconnect it before switching.".into());}
 if !active && desktop::running(&exe) {
  // A new RPC confirms file-store logout, but cannot reload the already-running
  // Desktop's in-memory authentication. Close it normally before installing auth.
  let mut rpc=codex::Rpc::start(&cli,&home).await?;
  let state=rpc.call("account/read",json!({"refreshToken":false})).await?;rpc.stop().await;
  if state.get("account")!=Some(&Value::Null) || !workspace::signed_out(&home)? {
   return Err("Codex has not finished signing out. Complete sign-out and choose the saved account again.".into());
  }
  switch_progress(app,id,"restarting","Sign-out detected. Restarting Codex to load your saved login. If Codex asks about unfinished work, respond there. Your projects and tasks stay in place.");
  desktop::request_signed_out_close(&exe,&home)?;
  let closed=async {
   while desktop::running(&exe){
    if !workspace::signed_out(&home)? {return Err("Codex signed in again while restarting. No authentication was replaced.".to_string());}
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
   }
   Ok::<(),String>(())
  };
  tokio::select! {
   _=cancel.notified()=>return Err("Account switch cancelled. No saved login was installed; Codex may already have closed.".into()),
   result=tokio::time::timeout(std::time::Duration::from_secs(30),closed)=>{result.map_err(|_|"Codex did not finish closing. Quit it from its menu and choose the saved account again. The Hub has not changed authentication.")??;}
  }
  if !workspace::signed_out(&home)? {return Err("Authentication changed while Codex was closing. Select the account again.".into());}
 }
 if !active {
  switch_progress(app,id,"switching","Loading and verifying your saved login…");
  let tx=workspace::activate(&home,&p,&store.profiles,&hub.path.parent().unwrap().join("auth-backups"),||desktop::running(&exe))?;
  let verification=async {
   let mut rpc=codex::Rpc::start(&cli,&home).await?;
   let actual=codex::identity_key(&rpc.verify_account().await?)?;rpc.stop().await;
   if actual!=key{return Err("The account in your workspace did not match the selection.".into());}
   Ok::<(),String>(())
  }.await;
  if let Err(error)=verification {
   if desktop::running(&exe){return Err(format!("{error} Codex reopened during verification; recovery backup preserved."));}
   tx.rollback()?;return Err(format!("{error} Your previous authentication was restored."));
  }
 }
 workspace::sync_active_slot(&p,&home)?;
 let result=codex::launch(&exe,&home,project.map(|p|p.path.as_path())).await?;
 hub.update(|s|{if let Some(p)=s.profiles.iter_mut().find(|p|p.id==id){p.last_used_at=Some(now());}if let Some(id)=project_id {if let Some(p)=s.projects.iter_mut().find(|p|p.id==id){p.last_opened_at=Some(now())}}Ok(())})?;
 if store.settings.hide_after_launch{if let Some(w)=app.get_webview_window("main"){let _=w.hide();}}
 Ok(result)
}
#[tauri::command] async fn diagnostics(hub:State<'_,Hub>,id:Option<String>)->Result<Value,String>{
 let _workspace_guard=hub.workspace_gate.read().await;let install=codex::detect(&hub.read().settings);let mut report=json!({"installation":install,"storageWritable":hub.path.parent().is_some_and(|p|p.is_dir()),"credentials":"Managed locally by Codex. No secrets are read into the Hub UI."});
 if let Some(id)=id {let p=hub.profile(&id)?;let op=hub.operation(&id);let _guard=op.try_lock().map_err(|_|"Profile is busy")?;report["homeExists"]=p.home.is_dir().into();report["desktopWorkspace"]="Existing Codex workspace (shared across accounts)".into();if let Some(cli)=install.cli {let result=async {let home=workspace::usage_home(&p,&workspace::shared_home()?)?;let mut rpc=codex::Rpc::start(&cli,&home).await?;rpc.account().await?;rpc.stop().await;Ok::<_,String>(())}.await;report["authentication"]=match result{Ok(())=>"Connected through Codex".into(),Err(e)=>e.into()};}}
 Ok(report)
}
#[tauri::command] fn open_profile_folder(hub:State<Hub>,id:String)->Result<(),String>{open::that(hub.profile(&id)?.home).map_err(|_|"Cannot open profile folder".into())}
#[tauri::command] async fn export_config(hub:State<'_,Hub>)->Result<bool,String>{
 let s=hub.read();let safe=json!({"version":1,"profiles":s.profiles.iter().map(|p|json!({"id":p.id,"name":p.name,"plan":p.plan,"accent":p.accent,"availability":p.availability})).collect::<Vec<_>>(),"projects":s.projects,"settings":s.settings});
 tauri::async_runtime::spawn_blocking(move||{if let Some(path)=rfd::FileDialog::new().set_file_name("draey-config.json").add_filter("JSON",&["json"]).save_file(){std::fs::write(path,serde_json::to_vec_pretty(&safe).map_err(|_|"Cannot encode export")?).map_err(|_|"Cannot write export")?;Ok(true)}else{Ok(false)}}).await.map_err(|_|"Export dialog failed".to_string())?
}
#[tauri::command] async fn import_config(app:tauri::AppHandle,hub:State<'_,Hub>)->Result<bool,String>{
 let file=tauri::async_runtime::spawn_blocking(||rfd::FileDialog::new().add_filter("JSON",&["json"]).pick_file()).await.map_err(|_|"Import dialog failed")?;let Some(file)=file else{return Ok(false)};
 let bytes=std::fs::read(file).map_err(|_|"Cannot read import")?;if bytes.len()>2_000_000{return Err("Configuration file is too large".into())}
 let raw:Value=serde_json::from_slice(&bytes).map_err(|_|"Invalid JSON")?;if raw["version"]!=1{return Err("Unsupported export version".into())}
 // Never trust imported home paths or credentials. Recreate empty isolated homes and remap projects.
 let entries=raw["profiles"].as_array().ok_or("Profiles missing in export")?;
 let mut profiles=vec![];let mut mapping=HashMap::new();
 for v in entries {let old=v["id"].as_str().ok_or("Invalid profile id")?;if mapping.contains_key(old){return Err("Duplicate profile id in export".into())}let id=uuid::Uuid::new_v4().to_string();let base=hub.root().join(&id);let profile=Profile{id:id.clone(),name:name(v["name"].as_str().ok_or("Invalid profile name")?)?,plan:v["plan"].as_str().filter(|v|["pro","plus","other"].contains(v)).ok_or("Invalid plan")?.into(),accent:v["accent"].as_str().filter(|v|["blue","mint","violet","amber","rose"].contains(v)).ok_or("Invalid accent")?.into(),availability:v["availability"].as_str().filter(|v|["available","reserved","friend-priority"].contains(v)).ok_or("Invalid reservation")?.into(),home:base.join("home"),desktop_data:base.join("desktop"),managed:true,created_at:now(),last_used_at:None,connection:"auth-required".into(),identity_key:None,account_email:None,actual_plan:None};mapping.insert(old.to_string(),id);profiles.push(profile);}
 let mut projects:Vec<Project>=serde_json::from_value(raw["projects"].clone()).map_err(|_|"Invalid projects in export")?;
 for p in &mut projects {p.id=uuid::Uuid::new_v4().to_string();p.name=name(&p.name)?;if !p.path.is_absolute(){return Err("Imported project needs an absolute path".into())}p.preferred_profile_id=p.preferred_profile_id.as_ref().and_then(|id|mapping.get(id)).cloned();}
 for p in &profiles{std::fs::create_dir_all(&p.home).map_err(|_|"Cannot create imported profile")?;std::fs::create_dir_all(&p.desktop_data).map_err(|_|"Cannot create desktop profile")?;std::fs::write(p.home.join("config.toml"),"cli_auth_credentials_store = \"file\"\n").map_err(|_|"Cannot initialize imported profile")?;}
 hub.update(|s|{s.profiles.extend(profiles);s.projects.extend(projects);Ok(())})?;update_tray(&app);Ok(true)
}
fn show(app:&tauri::AppHandle){if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.unminimize();let _=w.set_focus();}}
fn keep_saved_login_current(app:tauri::AppHandle) {
 tauri::async_runtime::spawn(async move {
  loop {
   tokio::time::sleep(std::time::Duration::from_secs(2)).await;
   let hub=app.state::<Hub>();
   let Ok(_workspace)=hub.workspace_gate.try_read() else{continue};
   let Ok(home)=workspace::shared_home() else{continue};
   // Desktop can rotate credentials between usage refreshes. Preserve its latest
   // file in the matching slot, including while the Hub is hidden in the tray.
   for profile in hub.read().profiles {
    let operation=hub.operation(&profile.id);
    let Ok(_guard)=operation.try_lock() else{continue};
    let _=workspace::sync_active_slot(&profile,&home);
   }
  }
 });
}
fn update_tray(app:&tauri::AppHandle){use tauri::menu::{Menu,MenuItem};let Ok(menu)=Menu::new(app) else{return};let add=|id:String,label:String|{if let Ok(item)=MenuItem::with_id(app,id,label,true,None::<&str>){let _=menu.append(&item);}};add("dashboard".into(),"Draey Codex Hub".into());for p in app.state::<Hub>().read().profiles{add(format!("profile:{}",p.id),format!("Open {} · {}",p.name,p.availability.replace('-'," ")));}add("refresh".into(),"Refresh all limits".into());add("settings".into(),"Settings".into());add("quit".into(),"Quit Hub".into());if let Some(tray)=app.tray_by_id("hub"){let _=tray.set_menu(Some(menu));}}
pub fn run(){
 let builder=tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|app,_,_|show(app))).setup(|app|{
  let root=app.path().app_local_data_dir()?;std::fs::create_dir_all(&root)?;let path=root.join("hub.json");let store=storage::load(&path).map_err(std::io::Error::other)?;
  app.manage(Hub{path,store:Mutex::new(store),operations:Mutex::new(HashMap::new()),logins:Mutex::new(HashMap::new()),workspace_gate:tokio::sync::RwLock::new(()),pending_switch:Mutex::new(None),switch_cancel:Mutex::new(None)});
  let icon=tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;
  tauri::tray::TrayIconBuilder::with_id("hub").icon(icon).tooltip("Draey Codex Hub").on_menu_event(|app,event|{let id=event.id.as_ref();match id {"quit"=>app.exit(0),"dashboard"=>show(app),"settings"=>{show(app);let _=app.emit("navigate","settings");},"refresh"=>{let app=app.clone();let profiles=app.state::<Hub>().read().profiles;for p in profiles{let app=app.clone();tauri::async_runtime::spawn(async move{let _=refresh(&app,p.id).await;});}},_=>{if let Some(id)=id.strip_prefix("profile:"){let app=app.clone();let id=id.to_string();tauri::async_runtime::spawn(async move{if let Err(e)=launch_profile(app.clone(),id,None).await{show(&app);let _=app.emit("hub-error",e);}});}}}}).build(app)?;
  update_tray(app.handle());
  keep_saved_login_current(app.handle().clone());
  if std::env::args().any(|a|a=="--background"){if let Some(w)=app.get_webview_window("main"){let _=w.hide();}}
  Ok(())
 }).on_window_event(|w,event|{if let tauri::WindowEvent::CloseRequested{api,..}=event {if w.app_handle().state::<Hub>().read().settings.minimize_to_tray{api.prevent_close();let _=w.hide();}}})
 .invoke_handler(tauri::generate_handler![load_state,detect_codex,choose_path,save_profile,remove_profile,save_project,remove_project,save_settings,refresh_usage,login_profile,cancel_login,launch_profile,workspace_status,cancel_switch,diagnostics,open_profile_folder,export_config,import_config]);
 if let Err(error)=builder.run(tauri::generate_context!()){let _=rfd::MessageDialog::new().set_title("Draey Codex Hub could not start").set_description(format!("{error}\nYour profile files have been preserved.")).set_level(rfd::MessageLevel::Error).show();}
}

