use crate::model::*;
use std::{fs, io::Write, path::Path};
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
 #[test] fn round_trip_and_cache_never_live() { let d=tempfile::tempdir().unwrap(); let p=d.path().join("state.json"); let mut s=Store::default(); for i in 0..9 { s.profiles.push(Profile { id:i.to_string(),name:format!("Account {i}"),plan:"other".into(),accent:"blue".into(),home:d.path().into(),desktop_data:d.path().into(),managed:true,availability:"friend-priority".into(),created_at:now(),last_used_at:None,connection:"connected".into(),identity_key:None,account_email:None,actual_plan:None }); } s.projects.push(Project{id:"p".into(),name:"Project".into(),path:d.path().into(),preferred_profile_id:Some("8".into()),pinned:true,last_opened_at:None}); s.usage_cache.insert("8".into(), Snapshot{windows:vec![],fetched_at:now(),source:"codex".into(),state:"live".into(),message:None,reset_credits:None}); save(&p,&s).unwrap(); save(&p,&s).unwrap(); let loaded=load(&p).unwrap(); assert_eq!(loaded.profiles.len(),9); assert_eq!(loaded.profiles[0].availability,"friend-priority"); assert_eq!(loaded.projects[0].preferred_profile_id.as_deref(),Some("8")); assert_eq!(loaded.usage_cache["8"].state,"stale"); }
 #[test] fn corrupt_and_future_preserved() { let d=tempfile::tempdir().unwrap();let p=d.path().join("state.json"); for bytes in ["{", "{\"version\":99}"] {fs::write(&p,bytes).unwrap();assert!(load(&p).is_err());assert_eq!(fs::read_to_string(&p).unwrap(),bytes);} }
}

