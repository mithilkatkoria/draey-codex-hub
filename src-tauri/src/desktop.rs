//! A normal close request for the signed-out default Desktop instance only.
//! Never terminate processes or send login requests to an unrelated instance.
use std::path::Path;

fn default_main(exe: &Path, actual: Option<&Path>, args: &[std::ffi::OsString], env: &[std::ffi::OsString]) -> bool {
    actual.is_some_and(|p| p.to_string_lossy().eq_ignore_ascii_case(&exe.to_string_lossy()))
        && !args.is_empty()
        && !env.iter().any(|v| v.to_string_lossy().split_once('=').is_some_and(|(k,v)| k.eq_ignore_ascii_case("CODEX_ELECTRON_USER_DATA_PATH") && !v.is_empty()))
        && !args.iter().skip(1).any(|a| {
            let arg = a.to_string_lossy().to_ascii_lowercase();
            arg == "--type" || arg.starts_with("--type=")
                || arg == "--user-data-dir" || arg.starts_with("--user-data-dir=")
        })
}

pub fn main_processes(exe: &Path) -> Result<Vec<u32>, String> {
    let mut system = sysinfo::System::new();
    system.refresh_processes_specifics(sysinfo::ProcessesToUpdate::All, true,
        sysinfo::ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::Always).with_cmd(sysinfo::UpdateKind::Always).with_environ(sysinfo::UpdateKind::Always));
    let mut pids=vec![];
    for p in system.processes().values() {
        if p.name().to_string_lossy().eq_ignore_ascii_case(&exe.file_name().unwrap_or_default().to_string_lossy()) && (p.exe().is_none() || p.cmd().is_empty()) {
            return Err("Cannot inspect the running Codex instance safely. Quit Codex manually and try again.".into());
        }
        if default_main(exe,p.exe(),p.cmd(),p.environ()) {pids.push(p.pid().as_u32());}
    }
    Ok(pids)
}

pub fn running(exe: &Path) -> bool { main_processes(exe).map_or(true, |pids|!pids.is_empty()) }

pub fn request_signed_out_close(exe: &Path, home: &Path) -> Result<(), String> {
    if !crate::workspace::signed_out(home)? { return Err("Codex is signed in again. No close request was sent.".into()); }
    let pids = main_processes(exe)?;
    if pids.is_empty() { return Ok(()); }
    #[cfg(windows)] {
        use windows_sys::{core::BOOL, Win32::{Foundation::{HWND, LPARAM}, UI::WindowsAndMessaging::{EnumWindows,GetWindowThreadProcessId,IsWindowVisible,PostMessageW,WM_CLOSE}}};
        struct Context { pids: Vec<u32>, sent: usize }
        unsafe extern "system" fn close_window(window: HWND, data: LPARAM) -> BOOL {
            let ctx = &mut *(data as *mut Context);
            let mut pid=0;GetWindowThreadProcessId(window,&mut pid);
            if ctx.pids.contains(&pid) && IsWindowVisible(window)!=0 && PostMessageW(window,WM_CLOSE,0,0)!=0 { ctx.sent+=1; }
            1
        }
        let mut ctx=Context{pids,sent:0};
        if !crate::workspace::signed_out(home)? { return Err("Codex signed in again. Cancel and select the account again.".into()); }
        unsafe { EnumWindows(Some(close_window), &mut ctx as *mut Context as LPARAM); }
        if ctx.sent==0 { return Err("Codex is running in the background. Quit Codex from its menu, then select the saved account again.".into()); }
        Ok(())
    }
    #[cfg(not(windows))] { let _=pids;Err("Automatic signed-out restart is currently available on Windows only.".into()) }
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn selects_only_the_default_main_process_of_the_chosen_installation() {
        let exe=Path::new("C:/Codex/ChatGPT.exe");
        let args=|items:&[&str]|items.iter().map(std::ffi::OsString::from).collect::<Vec<_>>();
        assert!(default_main(exe,Some(exe),&args(&["ChatGPT.exe"]),&[]));
        assert!(!default_main(exe,Some(exe),&args(&["ChatGPT.exe","--type=renderer"]),&[]));
        assert!(!default_main(exe,Some(exe),&args(&["ChatGPT.exe","--user-data-dir=C:/another"]),&[]));
        assert!(!default_main(exe,Some(exe),&args(&["ChatGPT.exe"]),&args(&["CODEX_ELECTRON_USER_DATA_PATH=C:/another"])));
        assert!(!default_main(exe,Some(Path::new("C:/Other/ChatGPT.exe")),&args(&["ChatGPT.exe"]),&[]));
        assert!(!default_main(exe,Some(exe),&[],&[]));
    }
}
