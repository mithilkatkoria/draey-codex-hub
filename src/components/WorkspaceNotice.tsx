import { FolderOpen, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Profile, WorkspaceStatus } from '../types';

export function WorkspaceNotice({workspace,profiles,onCancel}:{workspace?:WorkspaceStatus;profiles:Profile[];onCancel:()=>void}) {
 const notice=useRef<HTMLElement>(null);
 useEffect(()=>{if(workspace?.pending?.stage==='waiting'||workspace?.pending?.stage==='restarting'){notice.current?.scrollIntoView?.({block:'start'});notice.current?.focus({preventScroll:true});}},[workspace?.pending?.stage]);
 if(!workspace||!workspace.pending)return null;
 const current=profiles.find(p=>p.id===workspace.activeProfileId);
 const pending=workspace.pending;
 return <section ref={notice} tabIndex={-1} className={`workspace-notice ${pending?'switch-pending':''}`} role={pending?'status':undefined}>
  <div className="workspace-notice-icon">{pending?<RefreshCw size={19} className="spin"/>:<FolderOpen size={19}/>}</div>
  <div><strong>{pending?(pending.stage==='waiting'?'Sign out in Codex to switch':pending.stage==='restarting'?'Loading your saved account':'Preparing your workspace'):'Your projects. Your tasks. The same Codex.'}</strong>
  <p>{pending?pending.message:'All accounts open your existing workspace. Switching accounts may require quitting and reopening Codex.'}</p></div>
  {(pending?.stage==='waiting'||pending?.stage==='restarting')?<button className="secondary" onClick={onCancel}><X size={14}/> Cancel switch</button>:!pending&&<span className="workspace-current">{current?`Current · ${current.name}`:'Existing workspace'}</span>}
 </section>;
}
