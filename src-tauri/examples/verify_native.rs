//! Native integration checks using the same Rust protocol and launch implementation as the Hub.
use draey_hub::{codex,workspace,storage,desktop,model::{Settings},usage};
use std::path::PathBuf;
#[tokio::main]
async fn main() {
 let args:Vec<String>=std::env::args().collect();
 let result=match args.get(1).map(String::as_str) {
  Some("desktop-check")=>desktop_check(),
  Some("host-check")=>draey_hub::host::is_codex_package().map(|packaged|println!("{}",serde_json::json!({"insideCodexPackage":packaged}))),
  Some("recover")=>storage::load_current().map(|(path,store)|println!("{}",serde_json::json!({"storage":path,"profilesRecovered":store.profiles.len(),"projects":store.projects.len()}))),
  Some("workspace-check")=>workspace_check(),
  Some("profile-usage")=>profile_usage(args.get(2).ok_or("Pass a saved profile id")).await,
  Some("usage")=>usage_check(args.get(2).map(PathBuf::from)).await,

  _=>Err("Use: verify_native usage [CODEX_HOME]".into())
 };
 if let Err(e)=result {eprintln!("{e}");std::process::exit(1);}
}
async fn profile_usage(id:Result<&String,&str>)->Result<(),String>{
 let (_,store)=storage::load_current()?;
 let profile=store.profiles.iter().find(|p|Some(&p.id)==id.ok()).ok_or("Saved profile not found")?;
 let cli=codex::detect(&store.settings).cli.ok_or("CLI not detected")?;
 let home=workspace::usage_home(profile,&workspace::shared_home()?)?;
 let mut rpc=codex::Rpc::start(&cli,&home).await?;
 let (account,value)=rpc.account_with_limits().await?;let key=codex::identity_key(&account)?;
 rpc.stop().await;workspace::sync_active_slot(profile,&home)?;
 if profile.identity_key.as_ref().is_some_and(|expected|expected!=&key){return Err("Saved identity mismatch".into());}
 println!("{}",serde_json::json!({"identityFingerprint":&key[..12],"plan":account.get("planType"),"snapshot":usage::parse(&value)?}));Ok(())
}
async fn usage_check(home:Option<PathBuf>)->Result<(),String>{
 let installation=codex::detect(&Settings::default());let cli=installation.cli.ok_or("CLI not detected")?;
 let home=home.or(installation.existing_home).ok_or("No Codex home")?;
 let mut rpc=codex::Rpc::start(&cli,&home).await?;let (account,value)=rpc.account_with_limits().await?;let key=codex::identity_key(&account)?;
 let snapshot=usage::parse(&value)?;rpc.stop().await;
 println!("{}",serde_json::json!({"identityFingerprint":&key[..12],"plan":account.get("planType"),"snapshot":snapshot}));Ok(())
}

fn workspace_check()->Result<(),String>{
 let path=storage::root()?.join("hub.json");
 let store=storage::load(&path)?;let home=workspace::shared_home()?;
 workspace::ensure_file_store(&home)?;
 let profiles:Vec<_>=store.profiles.iter().map(|p|serde_json::json!({"name":p.name,"usesExistingWorkspaceAuth":workspace::is_active(p,&home).unwrap_or(false),"authFileValid":workspace::Auth::read(&p.home).is_ok_and(|a|a.is_some())})).collect();
 println!("{}",serde_json::json!({"desktopRunning":codex::desktop_running(),"workspace":home,"profiles":profiles}));Ok(())
}

fn desktop_check()->Result<(),String>{
 let install=codex::detect(&Settings::default());let exe=install.desktop.ok_or("No desktop detected")?;
 let home=workspace::shared_home()?;
 println!("{}",serde_json::json!({"defaultDesktopCount":desktop::main_processes(&exe)?.len(),"signedOut":workspace::signed_out(&home)?,"normalQuitAvailable":desktop::can_request_quit(&exe)?}));Ok(())
}
