//! Account slots share the original desktop workspace. Only auth.json is transferred,
//! and only after every Codex Desktop process has exited. Never copy session databases.
use crate::model::Profile;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::{Path, PathBuf}};

// Deliberately neither Debug nor Serialize: credentials must never enter diagnostics/UI.
pub struct Auth { bytes: Vec<u8>, identity: String }
impl Auth {
    pub fn read(home: &Path) -> Result<Option<Self>, String> {
        let bytes = match fs::read(home.join("auth.json")) {
            Ok(v) => v,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(_) => return Err("Cannot read Codex authentication. Check folder permissions.".into()),
        };
        Self::parse(bytes).map(Some)
    }
    fn parse(bytes: Vec<u8>) -> Result<Self, String> {
        let invalid = "Codex authentication is not a supported ChatGPT file. Reconnect this account.";
        if bytes.len() > 1_000_000 { return Err(invalid.into()); }
        let v: Value = serde_json::from_slice(&bytes).map_err(|_| invalid)?;
        let tokens = &v["tokens"];
        let id = tokens["id_token"].as_str().ok_or(invalid)?;
        let payload = id.split('.').nth(1).ok_or(invalid)?;
        let payload = URL_SAFE_NO_PAD.decode(payload).map_err(|_| invalid)?;
        let claims: Value = serde_json::from_slice(&payload).map_err(|_| invalid)?;
        let subject = claims["sub"].as_str().filter(|s| !s.is_empty()).ok_or(invalid)?;
        let account = tokens["account_id"].as_str().filter(|s| !s.is_empty()).ok_or(invalid)?;
        for key in ["access_token", "refresh_token"] {
            if tokens[key].as_str().filter(|s| !s.is_empty()).is_none() { return Err(invalid.into()); }
        }
        // Local routing only. The app-server still verifies the account with OpenAI.
        let identity = format!("{:x}", Sha256::digest(format!("{subject}:{account}")));
        Ok(Self { bytes, identity })
    }
}

pub fn shared_home() -> Result<PathBuf, String> {
    dirs::home_dir().map(|p| p.join(".codex")).filter(|p| p.is_dir())
        .ok_or("Your existing Codex workspace was not found at ~/.codex. Open Codex normally first.".into())
}

pub fn ensure_file_store(home: &Path) -> Result<(), String> {
    let config = match fs::read_to_string(home.join("config.toml")) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(_) => return Err("Cannot read the existing Codex configuration.".into()),
    };
    let value: toml::Value = toml::from_str(&config).map_err(|_| "Existing Codex configuration is invalid; it has been preserved.")?;
    if value.get("cli_auth_credentials_store").and_then(toml::Value::as_str).is_some_and(|s| s != "file") {
        return Err("This workspace uses a credential store other than file. Account switching is unavailable; its configuration has been preserved.".into());
    }
    Ok(())
}

pub fn is_active(profile: &Profile, home: &Path) -> Result<bool, String> {
    let Some(slot) = Auth::read(&profile.home)? else { return Ok(false); };
    Ok(Auth::read(home)?.is_some_and(|active| active.identity == slot.identity))
}

// The active account's freshest token belongs to the existing workspace, not its
// dormant slot. Reading that slot could reuse an already rotated refresh token.
pub fn usage_home(profile: &Profile, home: &Path) -> Result<PathBuf, String> {
    if is_active(profile, home)? { Ok(home.into()) } else { Ok(profile.home.clone()) }
}

fn write_auth(home: &Path, bytes: &[u8]) -> Result<(), String> {
    fs::create_dir_all(home).map_err(|_| "Cannot create local authentication storage.")?;
    let mut temp = tempfile::NamedTempFile::new_in(home).map_err(|_| "Cannot prepare authentication file.")?;
    temp.write_all(bytes).map_err(|_| "Cannot write authentication file.")?;
    temp.as_file().sync_all().map_err(|_| "Cannot flush authentication file.")?;
    temp.persist(home.join("auth.json")).map_err(|_| "Cannot replace authentication file. Original preserved.")?;
    Ok(())
}

pub fn import_account(source: &Path, destination: &Path) -> Result<(), String> {
    ensure_file_store(source)?;
    let auth = Auth::read(source)?.ok_or("Sign into your existing Codex app before adding its account.")?;
    write_auth(destination, &auth.bytes)
}

pub struct Activation { home: PathBuf, slot: PathBuf, before: Option<Auth>, selected: String }
impl Activation {
    // Called only before launching Desktop if account verification fails.
    pub fn rollback(self) -> Result<(), String> {
        let current = Auth::read(&self.home)?.ok_or("Authentication changed during switching; backup preserved.")?;
        if current.identity != self.selected { return Err("Authentication changed during switching; backup preserved.".into()); }
        write_auth(&self.slot, &current.bytes)?;
        if let Some(before) = self.before { write_auth(&self.home, &before.bytes) }
        else { fs::remove_file(self.home.join("auth.json")).map_err(|_| "Cannot undo new authentication file.".into()) }
    }
}

pub fn activate(home: &Path, profile: &Profile, profiles: &[Profile], backup_root: &Path, running: impl Fn() -> bool) -> Result<Activation, String> {
    if running() { return Err("Quit Codex before changing the account. Your workspace is unchanged.".into()); }
    ensure_file_store(home)?;
    let incoming = Auth::read(&profile.home)?.ok_or("Connect the selected account first.")?;
    let before = Auth::read(home)?;
    if let Some(outgoing) = &before {
        // Durable recovery copy before changing either an account slot or the workspace.
        let backup = backup_root.join(uuid::Uuid::new_v4().to_string());
        write_auth(&backup, &outgoing.bytes)?;
        for p in profiles {
            if p.home == home { return Err("An old account entry references the workspace directly. Add its existing account again before switching.".into()); }
            if Auth::read(&p.home)?.is_some_and(|a| a.identity == outgoing.identity) {
                write_auth(&p.home, &outgoing.bytes)?;
            }
        }
    }
    // Recheck after backup to avoid overwriting an authentication change made meanwhile.
    let current = Auth::read(home)?;
    if running() || current.as_ref().map(|a| &a.bytes) != before.as_ref().map(|a| &a.bytes) {
        return Err("Codex reopened or authentication changed. Retry after quitting Codex; workspace authentication was preserved.".into());
    }
    write_auth(home, &incoming.bytes)?;
    Ok(Activation { home: home.into(), slot: profile.home.clone(), before, selected: incoming.identity })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::now;
    fn auth(home: &Path, subject: &str, account: &str, refresh: &str) -> Vec<u8> {
        fs::create_dir_all(home).unwrap();
        let payload = URL_SAFE_NO_PAD.encode(serde_json::json!({"sub":subject}).to_string());
        let bytes = serde_json::to_vec(&serde_json::json!({"tokens":{"id_token":format!("header.{payload}.sig"),"account_id":account,"access_token":"fixture","refresh_token":refresh}})).unwrap();
        fs::write(home.join("auth.json"), &bytes).unwrap(); bytes
    }
    fn profile(home: PathBuf, id: &str) -> Profile {
        Profile { id:id.into(),name:id.into(),plan:"other".into(),accent:"blue".into(),home,desktop_data:PathBuf::from("unused"),managed:true,availability:"reserved".into(),created_at:now(),last_used_at:None,connection:"connected".into(),identity_key:None,account_email:None,actual_plan:None }
    }
    #[test]
    fn switches_only_auth_preserves_workspace_and_saves_rotated_outgoing_credentials() {
        let d = tempfile::tempdir().unwrap(); let home = d.path().join("workspace");
        let a = profile(d.path().join("a"), "a"); let b = profile(d.path().join("b"), "b");
        auth(&a.home,"alice","org-a","old"); let original = auth(&home,"alice","org-a","rotated");
        let incoming = auth(&b.home,"bob","org-b","b-token");
        for file in ["state_5.sqlite",".codex-global-state.json","config.toml"] { fs::write(home.join(file), if file=="config.toml" {"model = 'test'"} else {"existing projects and tasks"}).unwrap(); }
        let tx = activate(&home,&b,&[a.clone(),b.clone()],&d.path().join("backups"),||false).unwrap();
        assert_eq!(fs::read(home.join("auth.json")).unwrap(), incoming);
        assert_eq!(fs::read(a.home.join("auth.json")).unwrap(), original);
        assert_eq!(fs::read_to_string(home.join("state_5.sqlite")).unwrap(), "existing projects and tasks");
        assert_eq!(fs::read_to_string(home.join(".codex-global-state.json")).unwrap(), "existing projects and tasks");
        assert_eq!(fs::read_to_string(home.join("config.toml")).unwrap(), "model = 'test'");
        assert_eq!(usage_home(&b,&home).unwrap(),home);
        assert_eq!(usage_home(&a,&home).unwrap(),a.home);
        tx.rollback().unwrap(); assert_eq!(fs::read(home.join("auth.json")).unwrap(),original);
        assert_eq!(fs::read_dir(d.path().join("backups")).unwrap().count(),1);
    }
    #[test]
    fn running_desktop_and_keyring_configuration_are_never_overwritten() {
        let d=tempfile::tempdir().unwrap();let home=d.path().join("workspace");let p=profile(d.path().join("slot"),"p");
        let before=auth(&home,"a","org","a");auth(&p.home,"b","org","b");
        assert!(activate(&home,&p,&[],&d.path().join("backups"),||true).is_err());
        assert!(!d.path().join("backups").exists());
        fs::write(home.join("config.toml"),"cli_auth_credentials_store = 'keyring'").unwrap();
        assert!(activate(&home,&p,&[],&d.path().join("backups"),||false).is_err());
        assert_eq!(fs::read(home.join("auth.json")).unwrap(),before);
    }
    #[test]
    fn same_person_in_different_organizations_is_not_the_same_account() {
        let d=tempfile::tempdir().unwrap();let home=d.path().join("workspace");let p=profile(d.path().join("slot"),"p");
        auth(&home,"alice","org-a","a");auth(&p.home,"alice","org-b","b");
        assert!(!is_active(&p,&home).unwrap());
        fs::write(p.home.join("auth.json"),"malformed secret fixture").unwrap();
        assert!(Auth::read(&p.home).err().unwrap().contains("Reconnect"));
    }
    #[test]
    fn switching_back_uses_latest_tokens_and_preserves_both_slots() {
        let d=tempfile::tempdir().unwrap();let home=d.path().join("workspace");
        let a=profile(d.path().join("a"),"a");let b=profile(d.path().join("b"),"b");
        auth(&a.home,"alice","org-a","old-a");
        let fresh_a=auth(&home,"alice","org-a","fresh-a");
        auth(&b.home,"bob","org-b","old-b");
        let profiles=[a.clone(),b.clone()];let backups=d.path().join("backups");
        activate(&home,&b,&profiles,&backups,||false).unwrap();
        let fresh_b=auth(&home,"bob","org-b","fresh-b");
        activate(&home,&a,&profiles,&backups,||false).unwrap();
        assert_eq!(fs::read(home.join("auth.json")).unwrap(),fresh_a);
        assert_eq!(fs::read(b.home.join("auth.json")).unwrap(),fresh_b);
        assert!(is_active(&a,&home).unwrap());assert!(!is_active(&b,&home).unwrap());
    }
    #[test]
    fn reopening_during_backup_aborts_before_workspace_auth_changes() {
        let d=tempfile::tempdir().unwrap();let home=d.path().join("workspace");let p=profile(d.path().join("b"),"b");
        let original=auth(&home,"alice","org-a","fresh");auth(&p.home,"bob","org-b","b");
        let checks=std::cell::Cell::new(0);
        assert!(activate(&home,&p,&[p.clone()],&d.path().join("backups"),||{checks.set(checks.get()+1);checks.get()>1}).is_err());
        assert_eq!(fs::read(home.join("auth.json")).unwrap(),original);
    }
}
