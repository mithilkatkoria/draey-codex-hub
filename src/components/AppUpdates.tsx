import { Download, RefreshCw, ArrowUpRight } from 'lucide-react';
import { checkUpdates, installUpdate, useUpdates } from '../services/updates';
import { native } from '../services/native';

export function AppUpdates({compact=false}:{compact?:boolean}) {
 const s=useUpdates();
 const busy=['checking','downloading','installing'].includes(s.phase);
 if(compact&&!['available','downloading','installing'].includes(s.phase))return null;
 return <section className={compact?'update-banner':'settings-panel app-updates'} aria-label="App updates">
  <div><h2>{s.update?`Version ${s.update.version} is available`:'App updates'}</h2>
   <p className="muted" role="status">{s.phase==='current'?'You have the latest published update.':s.phase==='checking'?'Checking for updates...':s.phase==='downloading'?`Downloading and verifying${s.percent==null?'...':` (${s.percent}%)`}`:s.phase==='installing'?'Opening the installer. The Hub will close and reopen.':s.phase==='error'?s.error:'Checks automatically after startup. Download and install when you are ready.'}</p>
   {!compact&&<p className="muted small">Your saved accounts and projects are preserved. Finish any account sign-in or switch first. A portable copy will be upgraded to an installed app with a Start menu shortcut.</p>}
   {!compact&&s.update?.notes&&<details><summary>What changed</summary><p className="update-notes">{s.update.notes}</p></details>}
  </div>
  <div className="update-actions">{s.phase==='available'?<button className="primary" onClick={()=>void installUpdate()}><Download size={14}/>Download and install</button>:<button className="secondary" disabled={busy} onClick={()=>void checkUpdates()}><RefreshCw size={14} className={busy?'spin':''}/>{busy?'Please wait':'Check for updates'}</button>}
  {!compact&&<button className="text-button" onClick={()=>void native('open_releases').catch(()=>{})}>All releases<ArrowUpRight size={12}/></button>}</div>
 </section>;
}
