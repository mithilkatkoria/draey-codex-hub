//! Codex for Windows kills its child processes when it quits. Launch the Hub
//! through the independent Explorer shell before starting any account operation.
pub fn is_codex_package() -> Result<bool,String> {
    #[cfg(windows)] {
        use windows_sys::Win32::{Foundation::{APPMODEL_ERROR_NO_PACKAGE,ERROR_INSUFFICIENT_BUFFER,ERROR_SUCCESS},Storage::Packaging::Appx::GetCurrentPackageFullName};
        let mut len=0;
        let result=unsafe{GetCurrentPackageFullName(&mut len,std::ptr::null_mut())};
        if result==APPMODEL_ERROR_NO_PACKAGE{return Ok(false);}
        if result!=ERROR_INSUFFICIENT_BUFFER || len>4096{return Err("Cannot check the Windows application host. Open the Hub from Explorer.".into());}
        let mut name=vec![0u16;len as usize];
        if unsafe{GetCurrentPackageFullName(&mut len,name.as_mut_ptr())}!=ERROR_SUCCESS{return Err("Cannot read the Windows application host.".into());}
        Ok(String::from_utf16_lossy(&name).starts_with("OpenAI.Codex_"))
    }
    #[cfg(not(windows))] {Ok(false)}
}

pub fn handoff_if_needed() -> Result<bool,String> {
    let root=crate::storage::root()?;let marker=root.join(".explorer-launch");
    if !is_codex_package()? {let _=std::fs::remove_file(marker);return Ok(false);}
    if std::fs::metadata(&marker).and_then(|m|m.modified()).ok().and_then(|t|t.elapsed().ok()).is_some_and(|d|d.as_secs()<15) {
        return Err("Windows could not detach the Hub from Codex. Open the Hub executable directly from File Explorer so it remains open when Codex quits.".into());
    }
    std::fs::create_dir_all(&root).map_err(|_|"Cannot prepare independent Hub startup.")?;
    std::fs::write(&marker,b"Explorer handoff pending").map_err(|_|"Cannot prepare independent Hub startup.")?;
    let exe=std::env::current_exe().map_err(|_|"Cannot locate the Hub executable.")?;
    let windows=std::env::var_os("WINDIR").ok_or("Windows directory was not found.")?;
    let mut command=std::process::Command::new(std::path::PathBuf::from(windows).join("explorer.exe"));
    command.arg(exe);
    #[cfg(windows)] {use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}
    if command.spawn().is_err(){let _=std::fs::remove_file(marker);return Err("Open the Hub executable from File Explorer to continue.".into());}
    Ok(true)
}
