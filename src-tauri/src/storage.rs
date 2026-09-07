use crate::model::*;
use std::{fs, io::Write, path::Path};
/// AppData is virtualized for children of the packaged Codex app on Windows.
/// Keep account slots outside that namespace so Explorer and development launches
/// resolve the same files. Legacy data is copied once and never removed.
pub fn root() -> Result<std::path::PathBuf,String> {
    dirs::home_dir().map(|p|p.join(".draey-codex-hub")).ok_or("Cannot locate your Windows user folder.".into())
}
pub fn load_current() -> Result<(std::path::PathBuf,Store),String> {
    let root=root()?;
    let local=dirs::data_local_dir().ok_or("Cannot locate local application data.")?;
    let ordinary=local.join("dev.draey.codexhub");
    let packaged=local.join("Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/dev.draey.codexhub");
    let store=migrate(&root,&ordinary,&[packaged,ordinary.clone()])?;
    Ok((root.join("hub.json"),store))
}
pub fn migrate(destination:&Path,ordinary:&Path,candidates:&[std::path::PathBuf])->Result<Store,String> {
    let path=destination.join("hub.json");
    if path.exists(){return load(&path);}
    let mut sources=vec![];
    for source in candidates {
        let file=source.join("hub.json");
        if !file.exists(){continue;}
        let store=load(&file)?;
        let modified=fs::metadata(&file).and_then(|m|m.modified()).ok();
        sources.push((source,store,modified));
    }
    sources.sort_by_key(|(_,store,modified)|(store.profiles.len(),*modified));
    let Some((source,mut store,_))=sources.pop() else {let store=Store::default();save(&path,&store)?;return Ok(store)};
    for profile in &mut store.profiles {
        if !profile.managed {continue;}
        let relative=profile.home.strip_prefix(ordinary).or_else(|_|profile.home.strip_prefix(source));
        let Ok(relative)=relative else {continue};
        if relative.components().any(|c|!matches!(c,std::path::Component::Normal(_))) {return Err("A saved profile contains an invalid storage path. Original data preserved.".into());}
        let old=source.join(relative);let new=destination.join(relative);
        fs::create_dir_all(&new).map_err(|_|"Cannot recover saved account storage.")?;
        for name in ["config.toml","auth.json"] {
            let file=old.join(name);
            if file.exists(){fs::copy(file,new.join(name)).map_err(|_|"Cannot recover a saved login. Original account files are preserved.")?;}
        }
        profile.home=new;
        profile.desktop_data=profile.home.parent().unwrap().join("desktop");
    }
    if store.settings.profile_root.as_deref().is_some_and(|p|p.starts_with(ordinary)||p.starts_with(source)) {store.settings.profile_root=None;}
    save(&path,&store)?;
    load(&path)
}
pub fn load(path: &Path) -> Result<Store, String> {
    if !path.exists() { return Ok(Store::default()); }
    let bytes = fs::read(path).map_err(|_| "Cannot read Hub configuration.")?;
    let mut raw: serde_json::Value = serde_json::from_slice(&bytes).map_err(|_| "Hub configuration is damaged. Restore a safe export; the original file has been preserved.")?;
    // Version 0 preceded explicit cache versioning; preserve its profiles and projects.
    match raw.get("version").and_then(|v| v.as_u64()).unwrap_or(0) { 0 => { raw["version"] = 1.into(); }, 1 => {}, _ => return Err("Configuration was created by a newer Hub version.".into()) }
    let mut store: Store = serde_json::from_value(raw).map_err(|_| "Hub configuration has invalid fields; original preserved.")?;
    for snapshot in store.usage_cache.values_mut() { snapshot.state = "stale".into(); }
    Ok(store)
}
pub fn save(path: &Path, store: &Store) -> Result<(), String> {
    let parent=path.parent().ok_or("Invalid storage path")?;
    fs::create_dir_all(parent).map_err(|_| "Cannot create Hub storage.")?;
    let mut file=tempfile::NamedTempFile::new_in(parent).map_err(|_| "Cannot write Hub storage.")?;
    file.write_all(&serde_json::to_vec_pretty(store).map_err(|_| "Cannot encode configuration.")?).map_err(|_| "Cannot write configuration.")?;
    file.as_file().sync_all().map_err(|_| "Cannot flush configuration.")?;
    file.persist(path).map_err(|_| "Cannot replace configuration. Check file permissions.")?;
    Ok(())
}
#[cfg(test)] mod tests {
 use super::*;
 #[test] fn packaged_profiles_are_recovered_once_without_removing_originals() {
  let d=tempfile::tempdir().unwrap();let ordinary=d.path().join("Local/dev.draey.codexhub");let packaged=d.path().join("package/LocalCache/dev.draey.codexhub");let stable=d.path().join("stable");
  let mut store=Store::default();let home=ordinary.join("profiles/a/home");let actual=packaged.join("profiles/a/home");fs::create_dir_all(&actual).unwrap();
  fs::write(actual.join("auth.json"),"opaque credential fixture").unwrap();fs::write(actual.join("config.toml"),"cli_auth_credentials_store = 'file'").unwrap();
  store.profiles.push(Profile{id:"a".into(),name:"Saved account".into(),plan:"other".into(),accent:"mint".into(),home,desktop_data:ordinary.join("profiles/a/desktop"),managed:true,availability:"friend-priority".into(),created_at:now(),last_used_at:None,connection:"connected".into(),identity_key:None,account_email:None,actual_plan:None});
  save(&packaged.join("hub.json"),&store).unwrap();save(&ordinary.join("hub.json"),&Store::default()).unwrap();
  let recovered=migrate(&stable,&ordinary,&[packaged.clone(),ordinary.clone()]).unwrap();
  assert_eq!(recovered.profiles.len(),1);assert_eq!(recovered.profiles[0].availability,"friend-priority");assert!(recovered.profiles[0].home.starts_with(&stable));
  assert_eq!(fs::read_to_string(recovered.profiles[0].home.join("auth.json")).unwrap(),"opaque credential fixture");assert!(actual.join("auth.json").exists());
  save(&stable.join("hub.json"),&Store::default()).unwrap();assert!(migrate(&stable,&ordinary,&[packaged]).unwrap().profiles.is_empty());
 }
 #[test] fn round_trip_and_cache_never_live() { let d=tempfile::tempdir().unwrap(); let p=d.path().join("state.json"); let mut s=Store::default(); for i in 0..9 { s.profiles.push(Profile { id:i.to_string(),name:format!("Account {i}"),plan:"other".into(),accent:"blue".into(),home:d.path().into(),desktop_data:d.path().into(),managed:true,availability:"friend-priority".into(),created_at:now(),last_used_at:None,connection:"connected".into(),identity_key:None,account_email:None,actual_plan:None }); } s.projects.push(Project{id:"p".into(),name:"Project".into(),path:d.path().into(),preferred_profile_id:Some("8".into()),pinned:true,last_opened_at:None}); s.usage_cache.insert("8".into(), Snapshot{windows:vec![],fetched_at:now(),source:"codex".into(),state:"live".into(),message:None,reset_credits:None}); save(&p,&s).unwrap(); save(&p,&s).unwrap(); let loaded=load(&p).unwrap(); assert_eq!(loaded.profiles.len(),9); assert_eq!(loaded.profiles[0].availability,"friend-priority"); assert_eq!(loaded.projects[0].preferred_profile_id.as_deref(),Some("8")); assert_eq!(loaded.usage_cache["8"].state,"stale"); }
 #[test] fn corrupt_and_future_preserved() { let d=tempfile::tempdir().unwrap();let p=d.path().join("state.json"); for bytes in ["{", "{\"version\":99}"] {fs::write(&p,bytes).unwrap();assert!(load(&p).is_err());assert_eq!(fs::read_to_string(&p).unwrap(),bytes);} }
}

