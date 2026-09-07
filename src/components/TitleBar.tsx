import { useEffect, useState } from 'react';
import { Copy, Minus, Search, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { nativeAvailable } from '../services/native';
import brandMark from '../../src-tauri/icons/source.svg';

export function TitleBar({onSearch,onError,closeToTray}:{onSearch:()=>void;onError:(message:string)=>void;closeToTray:boolean}) {
 const [maximized,setMaximized]=useState(false);
 useEffect(()=>{
  if(!nativeAvailable)return;
  const win=getCurrentWindow();let disposed=false;let off:(()=>void)|undefined;
  const sync=()=>void win.isMaximized().then(value=>{if(!disposed)setMaximized(value);}).catch(()=>{});
  sync();void win.onResized(sync).then(unlisten=>disposed?unlisten():off=unlisten).catch(()=>{});
  return()=>{disposed=true;off?.();};
 },[]);
 async function control(action:'minimize'|'toggleMaximize'|'close') {
  try{await getCurrentWindow()[action]();}catch{onError('The window control could not complete. Try the Windows taskbar menu.');}
 }
 return <header className="window-bar">
  <div className="window-brand" data-tauri-drag-region><img className="brand-mark" src={brandMark} alt="" aria-hidden="true"/><strong>draey</strong><span className="window-product">Codex Hub</span></div>
  <div className="window-drag-space" data-tauri-drag-region/>
  <button className="window-search" onClick={onSearch}><Search size={14}/><span>Find an account, project, or action</span><kbd>Ctrl K</kbd></button>
  <div className="window-drag-space" data-tauri-drag-region/>
  {nativeAvailable&&<div className="window-controls">
   <button aria-label="Minimize window" title="Minimize" onClick={()=>void control('minimize')}><Minus size={15}/></button>
   <button aria-label={maximized?'Restore window':'Maximize window'} title={maximized?'Restore':'Maximize'} onClick={()=>void control('toggleMaximize')}>{maximized?<Copy size={12}/>:<Square size={12}/>}</button>
   <button className="window-close" aria-label="Close window" title={closeToTray?'Close to tray':'Close'} onClick={()=>void control('close')}><X size={16}/></button>
  </div>}
 </header>;
}
