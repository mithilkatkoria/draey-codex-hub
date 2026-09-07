//! Conservative recorder detection. A running app is not proof of recording.
use std::sync::atomic::{AtomicBool, Ordering};

static PRIVATE: AtomicBool = AtomicBool::new(true);
pub fn private() -> bool { PRIVATE.load(Ordering::Relaxed) }
pub fn set_private(value: bool) { PRIVATE.store(value, Ordering::Relaxed); }

fn recorder(name: &str) -> Option<&'static str> {
    match name.to_ascii_lowercase().as_str() {
        "obs64.exe" | "obs32.exe" | "obs.exe" => Some("OBS Studio"),
        "streamlabs desktop.exe" | "streamlabs obs.exe" => Some("Streamlabs Desktop"),
        "xsplit.core.exe" | "xsplit.broadcaster.exe" => Some("XSplit Broadcaster"),
        "bdcam.exe" | "bdcam64.exe" => Some("Bandicam"),
        "camtasiarecorder.exe" | "camrecorder.exe" => Some("Camtasia Recorder"),
        "screenclippinghost.exe" | "snippingtool.exe" => Some("Snipping Tool"),
        "sharex.exe" => Some("ShareX"),
        "loom.exe" => Some("Loom"),
        "nvidia share.exe" | "nvidia overlay.exe" => Some("NVIDIA capture overlay"),
        "gamebar.exe" | "gamebarftserver.exe" => Some("Xbox Game Bar"),
        _ => None,
    }
}

pub fn detect() -> Result<Vec<String>, String> {
    let mut system = sysinfo::System::new();
    system.refresh_processes_specifics(sysinfo::ProcessesToUpdate::All, true,
        sysinfo::ProcessRefreshKind::nothing());
    if system.processes().is_empty() { return Err("Recording app detection is unavailable".into()); }
    let apps: std::collections::BTreeSet<_> = system.processes().values()
        .filter_map(|p| recorder(&p.name().to_string_lossy())).map(String::from).collect();
    Ok(apps.into_iter().collect())
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn local_process_scan_returns_only_recognized_application_labels() {
        let apps=detect().expect("Local process-name scan should be available");
        println!("Recognized capture applications: {apps:?}");
        for app in apps { assert!(!app.contains('\\') && !app.contains('@') && !app.ends_with(".exe")); }
    }
    #[test] fn recognizes_recorders_without_treating_every_browser_as_recording() {
        for name in ["OBS64.EXE", "Streamlabs Desktop.exe", "XSplit.Core.exe", "bdcam.exe", "CamRecorder.exe", "Loom.exe", "NVIDIA Overlay.exe", "GameBar.exe", "ShareX.exe", "SnippingTool.exe"] {
            assert!(recorder(name).is_some(), "{name}");
        }
        for name in ["chrome.exe", "msedge.exe", "zoom.exe", "discord.exe", "obs64.exe.bak", "not-obs64.exe"] {
            assert!(recorder(name).is_none(), "{name}");
        }
    }
}
