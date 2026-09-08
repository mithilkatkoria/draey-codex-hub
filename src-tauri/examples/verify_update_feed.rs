//! Checks the actual configured update feed and signature without installing or opening a window.
use tauri_plugin_updater::UpdaterExt;
fn main() {
    let mut context = tauri::generate_context!();
    context.config_mut().app.windows.clear();
    let app = tauri::Builder::default().plugin(tauri_plugin_updater::Builder::new().build())
        .build(context).expect("Build headless updater probe");
    tauri::async_runtime::block_on(async {
        let ordinary = app.updater_builder().timeout(std::time::Duration::from_secs(30)).build().unwrap().check().await.expect("Check live update feed");
        println!("Newer version available: {}", ordinary.is_some());
        // Probe only: verify the current published installer as well, never install it.
        let update = app.updater_builder().timeout(std::time::Duration::from_secs(30))
            .version_comparator(|_,_|true).build().unwrap().check().await.unwrap().expect("Published update metadata");
        let bytes = update.download(|_,_|{},||{}).await.expect("Download and cryptographically verify installer");
        println!("Verified signed installer: version {}, {} bytes. Nothing installed.", update.version, bytes.len());
    });
}
