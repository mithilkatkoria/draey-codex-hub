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

fn quit_label(label: &str) -> bool {
    matches!(label.split('\t').next().unwrap_or("").replace('&', "").trim().to_ascii_lowercase().as_str(), "quit" | "exit" | "quit codex" | "exit codex" | "quit chatgpt" | "exit chatgpt")
}

#[cfg(windows)] mod menu {
    use super::*;
    use windows_sys::{core::BOOL, Win32::{Foundation::{HWND,LPARAM}, UI::{WindowsAndMessaging::*,Input::KeyboardAndMouse::IsWindowEnabled}}};
    unsafe fn quit_item(menu: HMENU, depth: usize) -> Option<u32> {
        if menu.is_null() || depth>5 {return None;}
        for position in 0..GetMenuItemCount(menu) {
            let state=GetMenuState(menu,position as u32,MF_BYPOSITION);
            if state==u32::MAX || state & (MF_DISABLED|MF_GRAYED)!=0 {continue;}
            let child=GetSubMenu(menu,position);
            if !child.is_null() {if let Some(id)=quit_item(child,depth+1){return Some(id);} continue;}
            let mut text=[0u16;256];
            let len=GetMenuStringW(menu,position as u32,text.as_mut_ptr(),text.len() as i32,MF_BYPOSITION);
            if len<=0 || len as usize>=text.len()-1 {continue;}
            let id=GetMenuItemID(menu,position);
            if id>0 && id<0xffff && quit_label(&String::from_utf16_lossy(&text[..len as usize])) {return Some(id);}
        }
        None
    }
    struct Search {pids:Vec<u32>, found:Option<(HWND,u32)>, visible:Option<(HWND,(bool,i64))>}
    unsafe extern "system" fn window(window: HWND,data:LPARAM)->BOOL {
        let search=&mut *(data as *mut Search);let mut pid=0;
        GetWindowThreadProcessId(window,&mut pid);
        // Electron also creates visible owned dialogs and utility windows. The
        // last enumerated HWND is not necessarily its application window.
        if search.pids.contains(&pid) && IsWindowVisible(window)!=0 && GetWindow(window,GW_OWNER).is_null() && IsWindowEnabled(window)!=0 {
            let mut class=[0u16;128];
            let len=GetClassNameW(window,class.as_mut_ptr(),class.len() as i32);
            if len<=0 || String::from_utf16_lossy(&class[..len as usize])!="Chrome_WidgetWin_1" {return 1;}
            let mut rect=std::mem::zeroed();
            if GetWindowRect(window,&mut rect)==0 {return 1;}
            let area=i64::from((rect.right-rect.left).max(0))*i64::from((rect.bottom-rect.top).max(0));
            if area<10_000 {return 1;}
            let rank=(GetForegroundWindow()==window,area);
            if search.visible.as_ref().is_none_or(|(_,previous)|rank>*previous){search.visible=Some((window,rank));}
            if let Some(id)=quit_item(GetMenu(window),0) {search.found=Some((window,id));return 0;}
        }
        1
    }
    pub fn find(exe:&Path)->Result<Option<(HWND,u32)>,String> {
        let mut search=Search{pids:main_processes(exe)?,found:None,visible:None};
        unsafe{EnumWindows(Some(window),&mut search as *mut Search as LPARAM);}
        Ok(search.found.or_else(||search.visible.map(|(w,_)|(w,0))))
    }
    pub fn request(exe:&Path)->Result<(),String> {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
        let (window,id)=find(exe)?.ok_or("Open Codex and choose File > Quit (Ctrl+Q). X can leave Codex in the background.")?;
        if id!=0 {
            if unsafe{PostMessageW(window,WM_COMMAND,id as usize,0)}==0 {return Err("Windows could not request Codex to quit. Use File > Quit inside Codex.".into());}
        } else {
            // Codex's custom Windows menu is not exposed through GetMenu. Its
            // application menu registers Ctrl+Q for the normal Quit action.
            // Never inject into another app or interfere with held modifier keys.
            unsafe {
                for key in [VK_CONTROL,VK_SHIFT,VK_MENU,VK_LWIN,VK_RWIN] {
                    if GetAsyncKeyState(key as i32)<0 {return Err("A keyboard modifier was held, so no shortcut was sent. Use File > Quit inside Codex.".into());}
                }
                ShowWindowAsync(window,SW_RESTORE);
                SetForegroundWindow(window);
                if GetForegroundWindow()!=window {return Err("Bring Codex to the front and press Ctrl+Q to quit normally.".into());}
                let key=|code,flags|INPUT{r#type:INPUT_KEYBOARD,Anonymous:INPUT_0{ki:KEYBDINPUT{wVk:code,wScan:0,dwFlags:flags,time:0,dwExtraInfo:0}}};
                let keys=[key(VK_CONTROL,0),key(0x51,0),key(0x51,KEYEVENTF_KEYUP),key(VK_CONTROL,KEYEVENTF_KEYUP)];
                if SendInput(keys.len() as u32,keys.as_ptr(),std::mem::size_of::<INPUT>() as i32)!=keys.len() as u32 {
                    let release=[key(0x51,KEYEVENTF_KEYUP),key(VK_CONTROL,KEYEVENTF_KEYUP)];
                    SendInput(release.len() as u32,release.as_ptr(),std::mem::size_of::<INPUT>() as i32);
                    return Err("Windows could not send the normal Quit shortcut. Press Ctrl+Q inside Codex.".into());
                }
            }
        }
        Ok(())
    }
}

pub fn can_request_quit(exe:&Path)->Result<bool,String> {
    #[cfg(windows)] {Ok(menu::find(exe)?.is_some())}
    #[cfg(not(windows))] {let _=exe;Ok(false)}
}

pub fn request_normal_quit(exe: &Path) -> Result<(), String> {
    if main_processes(exe)?.is_empty() {return Ok(());}
    #[cfg(windows)] {menu::request(exe)}
    #[cfg(not(windows))] {Err("Quit Codex manually, then choose the saved account.".into())}
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn only_exact_quit_commands_are_selected() {
        assert!(quit_label("E&xit\tAlt+F4"));assert!(quit_label("&Quit Codex"));
        for label in ["Close window","Sign out","Exit full screen","Force quit","Quit and discard"] {assert!(!quit_label(label));}
    }
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
