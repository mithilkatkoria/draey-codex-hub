use crate::model::*;
use serde_json::{json,Value};
use std::{path::{Path,PathBuf},process::Stdio,time::Duration};
use tokio::{io::{AsyncBufReadExt,AsyncWriteExt,BufReader,Lines},process::{Child,ChildStdin,ChildStdout,Command}};

pub fn clean_command(exe: &Path, home: &Path) -> Command {
 let mut c=Command::new(exe);
 for (key,_) in std::env::vars_os() { if key.to_string_lossy().starts_with("CODEX_") {c.env_remove(key);} }
 c.env("CODEX_HOME",home);
 for key in ["OPENAI_API_KEY", "OPENAI_BASE_URL", "CHATGPT_API_KEY", "ELECTRON_RUN_AS_NODE", "NODE_OPTIONS"] {c.env_remove(key);}
 #[cfg(windows)] c.creation_flags(0x08000000);
 c
}
fn executable(p: &Path) -> bool { p.is_file() && p.extension().is_some_and(|x| x.eq_ignore_ascii_case("exe")) }
#[derive(Clone,serde::Serialize)]
#[serde(rename_all="camelCase")]
pub struct Installation {pub desktop: Option<PathBuf>,pub cli: Option<PathBuf>,pub existing_home: Option<PathBuf>,pub isolation: String}
pub fn detect(s: &Settings) -> Installation {
 let mut candidates=vec![];
 if let Some(p)=&s.desktop_exe {candidates.push(p.clone());}
 let mut system=sysinfo::System::new();
 system.refresh_processes_specifics(sysinfo::ProcessesToUpdate::All,true,sysinfo::ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::Always));
 for process in system.processes().values() {if let Some(p)=process.exe() { if p.file_name().is_some_and(|n|n.eq_ignore_ascii_case("ChatGPT.exe")||n.eq_ignore_ascii_case("Codex.exe")) && p.parent().is_some_and(|n|n.join("resources/app.asar").exists()) {candidates.push(p.into());} }}
 if let Some(programs)=std::env::var_os("ProgramFiles") { if let Ok(entries)=std::fs::read_dir(PathBuf::from(programs).join("WindowsApps")) { let mut packages:Vec<_>=entries.flatten().filter(|e|e.file_name().to_string_lossy().starts_with("OpenAI.Codex_")).collect(); packages.sort_by_key(|e|std::cmp::Reverse(e.file_name())); for e in packages { candidates.push(e.path().join("app/ChatGPT.exe"));candidates.push(e.path().join("app/Codex.exe")); } } }
 if let Some(local)=dirs::data_local_dir() { for p in ["Programs/Codex/Codex.exe","Programs/ChatGPT/ChatGPT.exe","OpenAI/Codex/ChatGPT.exe"] {candidates.push(local.join(p));} }
 let desktop=candidates.into_iter().find(|p|executable(p));
 let mut cli=s.cli_exe.clone().filter(|p|executable(p));
 if cli.is_none() {if let Some(paths)=std::env::var_os("PATH") {cli=std::env::split_paths(&paths).map(|p|p.join("codex.exe")).find(|p|executable(p));}}
 if cli.is_none() {if let Some(local)=dirs::data_local_dir(){if let Ok(entries)=std::fs::read_dir(local.join("OpenAI/Codex/bin")){let mut versions:Vec<_>=entries.flatten().collect();versions.sort_by_key(|e|std::cmp::Reverse(e.metadata().and_then(|m|m.modified()).ok()));cli=versions.into_iter().map(|e|e.path().join("codex.exe")).find(|p|executable(p));}}}
 if cli.is_none() {cli=desktop.as_ref().and_then(|p|p.parent()).map(|p|p.join("resources/codex.exe")).filter(|p|executable(p));}
 let existing_home=dirs::home_dir().map(|p|p.join(".codex")).filter(|p|p.is_dir());
 Installation {desktop,cli,existing_home,isolation:"Accounts share your existing Codex workspace. Switching uses a normal quit and restart, preserving saved logins, projects, and desktop data.".into()}
}
/// Keep remote response details out of the UI. A network failure mentioning an
/// authentication endpoint must not turn a saved account into a disconnected one.
fn classify_error(error:&Value)->String {
 let message=error.get("message").and_then(Value::as_str).unwrap_or("").to_lowercase();
 if ["401","unauthorized","refresh_token_invalidated","refresh_token_reused","refresh_token_expired"].iter().any(|s|message.contains(s)) {
  "AUTH_REQUIRED: Codex rejected the saved login. Refresh or reconnect this account.".into()
 } else if ["network","connect","timeout","timed out","dns"].iter().any(|s|message.contains(s)) {
  "OFFLINE: Codex could not reach the usage service. Your saved login has been kept.".into()
 } else if ["not authenticated","authentication required","not logged in","sign in","sign-in"].iter().any(|s|message.contains(s)) {
  "AUTH_REQUIRED: Reconnect this profile through OpenAI sign-in.".into()
 } else {"Codex could not complete the request. Retry or run diagnostics.".into()}
}
pub struct Rpc {child:Child,input:ChildStdin,lines:Lines<BufReader<ChildStdout>>,next_id:u64,notifications:std::collections::VecDeque<Value>}
pub fn identity_key(account:&Value)->Result<String,String>{use sha2::{Digest,Sha256};let email=account.get("email").and_then(Value::as_str).filter(|s|!s.is_empty()).ok_or("Codex returned no account identity. Reconnect to validate this profile.")?;let discriminator=account.get("accountId").and_then(Value::as_str).unwrap_or("");Ok(format!("{:x}",Sha256::digest(format!("{}:{discriminator}",email.to_lowercase()).as_bytes())))}
impl Rpc {
 pub async fn start(exe:&Path,home:&Path) -> Result<Self,String> {
  let mut child=clean_command(exe,home).args(["app-server","--listen","stdio://"]).current_dir(home).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).kill_on_drop(true).spawn().map_err(|e|format!("Cannot start Codex app-server (Windows error {}). Check the CLI executable in Settings.",e.raw_os_error().unwrap_or(0)))?;
  let input=child.stdin.take().ok_or("Codex stdin unavailable")?;
  let lines=BufReader::new(child.stdout.take().ok_or("Codex stdout unavailable")?).lines();
  let mut rpc=Self{child,input,lines,next_id:0,notifications:Default::default()};
  rpc.call("initialize",json!({"clientInfo":{"name":"draey_codex_hub","title":"Draey Codex Hub","version":env!("CARGO_PKG_VERSION")},"capabilities":{"experimentalApi":false}})).await?;
  rpc.send(json!({"method":"initialized"})).await?;Ok(rpc)
 }
 async fn send(&mut self,v:Value)->Result<(),String> {let mut bytes=serde_json::to_vec(&v).map_err(|_|"Cannot encode Codex request")?;bytes.push(b'\n');self.input.write_all(&bytes).await.map_err(|_|"Codex connection closed".into())}
 pub async fn next(&mut self)->Result<Value,String> {if let Some(v)=self.notifications.pop_front(){return Ok(v);}self.raw_next().await}
 async fn raw_next(&mut self)->Result<Value,String> {loop {let line=self.lines.next_line().await.map_err(|_|"Cannot read Codex response")?.ok_or("Codex app-server exited")?;if line.len()>4*1024*1024 {return Err("Codex response exceeded size limit".into())} if let Ok(value)=serde_json::from_str(&line) {return Ok(value)} }}
 pub async fn call(&mut self,method:&str,params:Value)->Result<Value,String> {
  self.next_id+=1;let id=self.next_id;self.send(json!({"id":id,"method":method,"params":params})).await?;
  tokio::time::timeout(Duration::from_secs(25),async {loop {let v=self.raw_next().await?;if v.get("id").and_then(Value::as_u64)==Some(id) {if let Some(error)=v.get("error") {return Err(classify_error(error));}return v.get("result").cloned().ok_or("Malformed Codex response".into());} if v.get("method").is_some() && self.notifications.len()<256 {self.notifications.push_back(v);} }}).await.map_err(|_|"OFFLINE: Codex did not respond within 25 seconds.".to_string())?
 }
 /// Usage reads can return 401 for an expired access token without refreshing
 /// managed credentials. Ask Codex to refresh once before requiring browser login.
 pub async fn account_with_limits(&mut self)->Result<(Value,Value),String> {
  let account=self.account().await?;
  let result=self.call("account/rateLimits/read",json!({})).await;
  if !result.as_ref().is_err_and(|e|e.starts_with("AUTH_REQUIRED:")) {return result.map(|limits|(account,limits));}
  let renewed=self.verify_account().await?;
  if identity_key(&account)?!=identity_key(&renewed)? {return Err("AUTH_REQUIRED: The account changed during token refresh. Reconnect the intended account.".into());}
  let limits=self.call("account/rateLimits/read",json!({})).await?;
  Ok((renewed,limits))
 }
 pub async fn account(&mut self)->Result<Value,String> {self.read_account(false).await}
 pub async fn verify_account(&mut self)->Result<Value,String> {self.read_account(true).await}
 async fn read_account(&mut self,refresh:bool)->Result<Value,String> {let a=self.call("account/read",json!({"refreshToken":refresh})).await?;let account=a.get("account").filter(|v|!v.is_null()).ok_or(if refresh {"AUTH_REQUIRED: Codex could not renew this saved login. It may have expired or been revoked. Reconnect once, then switch using Quit rather than Sign out."} else {"AUTH_REQUIRED: Sign in to connect this profile."})?;if account.get("type").and_then(Value::as_str)!=Some("chatgpt") {return Err("Subscription usage requires a ChatGPT account, rather than API-key authentication.".into())} Ok(account.clone())}
 pub async fn stop(&mut self) {let _=self.child.kill().await;let _=self.child.wait().await;}
}
pub fn desktop_running() -> bool {
 let mut system=sysinfo::System::new();
 system.refresh_processes_specifics(sysinfo::ProcessesToUpdate::All,true,sysinfo::ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::Always));
 system.processes().values().any(|p| {
  let name=p.name().to_string_lossy();
  name.eq_ignore_ascii_case("ChatGPT.exe") || (name.eq_ignore_ascii_case("Codex.exe") && p.exe().is_some_and(|exe|exe.parent().is_some_and(|dir|dir.join("resources/app.asar").exists())))
 })
}
pub fn launch_args(project:Option<&Path>)->Vec<String> {
 let mut args=vec![];
 if let Some(p)=project {args.push("--open-project".into());args.push(p.to_string_lossy().into_owned());}
 args
}
pub async fn launch(exe:&Path,home:&Path,project:Option<&Path>)->Result<String,String> {
 if !executable(exe) {return Err("Codex Desktop executable is missing. Locate it in Settings.".into())}
 if !home.is_dir(){return Err("Your existing Codex workspace folder is missing.".into())}
 let mut child=clean_command(exe,home).args(launch_args(project)).current_dir(project.unwrap_or(home)).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|_|"Windows could not launch Codex Desktop.")?;
 tokio::time::sleep(Duration::from_millis(900)).await;
 if let Some(status)=child.try_wait().map_err(|_|"Cannot inspect Codex launch")? {if !status.success(){return Err("Codex Desktop exited during launch. Your account is selected; retry opening Codex.".into())}return Ok("Codex launch requested".into())}
 Ok("Codex launch requested".into())
}
#[cfg(test)] mod tests {
 use super::*;
 #[test] fn authentication_endpoint_network_errors_keep_saved_accounts_connected() {
  let network=classify_error(&json!({"message":"authentication endpoint connection timed out"}));
  assert!(network.starts_with("OFFLINE:"));
  assert!(!network.contains("endpoint"));
  assert!(classify_error(&json!({"message":"usage request returned 401 Unauthorized"})).starts_with("AUTH_REQUIRED:"));
  assert!(classify_error(&json!({"message":"refresh_token_invalidated"})).starts_with("AUTH_REQUIRED:"));
  assert!(!classify_error(&json!({"message":"author unavailable"})).starts_with("AUTH_REQUIRED:"));
 }
 #[test] fn launch_uses_existing_workspace_without_a_separate_desktop_profile() {
  let home=Path::new("C:/Users/person/.codex");
  let args=launch_args(Some(Path::new("C:/A project/$value")));
  assert_eq!(args,vec!["--open-project","C:/A project/$value"]);
  assert!(launch_args(None).is_empty());
  let c=clean_command(Path::new("ChatGPT.exe"),home);
  assert!(c.as_std().get_envs().any(|(k,v)|k=="CODEX_HOME"&&v==Some(home.as_os_str())));
  assert!(!c.as_std().get_envs().any(|(k,v)|k=="CODEX_ELECTRON_USER_DATA_PATH"&&v.is_some()));
 }
}
