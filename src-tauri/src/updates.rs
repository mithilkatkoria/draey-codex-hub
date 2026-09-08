use std::{sync::Mutex, time::Duration};
use tauri::{Emitter, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
pub struct UpdateState {
    operation: tokio::sync::Mutex<()>,
    pending: Mutex<Option<Update>>,
}

#[tauri::command]
pub async fn check_update(app: tauri::AppHandle, state: State<'_, UpdateState>) -> Result<Option<serde_json::Value>, String> {
    let _operation = state.operation.try_lock().map_err(|_| "An update operation is already running.")?;
    let update = app.updater_builder().timeout(Duration::from_secs(20)).build()
        .map_err(|_| "Update configuration is unavailable. Use GitHub releases.")?
        .check().await.map_err(|_| "Could not check GitHub for updates. Check your connection and try again.")?;
    if let Some(u) = &update {
        if !trusted_download(u.download_url.as_str()) { return Err("The update download is outside this project's releases. Installation was blocked.".into()); }
    }
    let info = update.as_ref().map(|u| serde_json::json!({"version":u.version,"currentVersion":u.current_version,"notes":u.body}));
    *state.pending.lock().map_err(|_| "Update state is unavailable")? = update;
    Ok(info)
}

fn trusted_download(url: &str) -> bool {
    url.starts_with("https://github.com/mithilkatkoria/draey-codex-hub/releases/download/")
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle, state: State<'_, UpdateState>) -> Result<(), String> {
    let _operation = state.operation.try_lock().map_err(|_| "An update operation is already running.")?;
    let update = state.pending.lock().map_err(|_| "Update state is unavailable")?.take()
        .ok_or("Check for updates again before installing.")?;
    let mut received = 0u64;
    let mut last_report = std::time::Instant::now();
    let data = tokio::time::timeout(Duration::from_secs(180), update.download(|chunk, total| {
        received += chunk as u64;
        if last_report.elapsed().as_millis() >= 150 {
            let _ = app.emit("update-progress", serde_json::json!({"received":received,"total":total}));
            last_report = std::time::Instant::now();
        }
    }, || {})).await.map_err(|_| "The update download timed out. Your current app is unchanged.")?
        .map_err(|_| "The download or its signature could not be verified. Nothing was installed. Check for updates and retry.")?;
    // Authentication operations must finish before the installer closes this Hub.
    let hub = app.state::<crate::Hub>();
    let _workspace = hub.workspace_gate.try_write().map_err(|_| "Finish account sign-in or switching, then check for updates again.")?;
    let _ = app.emit("update-progress", serde_json::json!({"received":data.len(),"total":data.len(),"installing":true}));
    update.install(data).map_err(|_| "Windows could not start the installer. Use the download on GitHub releases.")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restricts_update_downloads_to_this_repositories_https_releases() {
        assert!(trusted_download("https://github.com/mithilkatkoria/draey-codex-hub/releases/download/v1.0.0/setup.exe"));
        for bad in ["http://github.com/mithilkatkoria/draey-codex-hub/releases/download/a", "https://github.com.evil.test/mithilkatkoria/draey-codex-hub/releases/download/a", "https://github.com/other/repo/releases/download/a"] { assert!(!trusted_download(bad)); }
    }
}
