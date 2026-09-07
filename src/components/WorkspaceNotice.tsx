import { usePrivacy } from './StreamerMode';
import { PauseCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Profile, WorkspaceStatus } from '../types';

export function WorkspaceNotice({workspace,profiles,onCancel}:{workspace?:WorkspaceStatus;profiles:Profile[];onCancel:()=>void}) {
 const privacy=usePrivacy();
 const notice=useRef<HTMLElement>(null);
 useEffect(()=>{if(workspace?.pending?.stage==='waiting'||workspace?.pending?.stage==='restarting'){notice.current?.scrollIntoView?.({block:'start'});notice.current?.focus({preventScroll:true});}},[workspace?.pending?.stage]);
 if(!workspace||!workspace.pending)return null;
 const pending=workspace.pending;
 const needsQuit=pending.stage==='awaiting-quit';
 const selected=profiles.find(p=>p.id===pending.id);
 return <section ref={notice} tabIndex={-1} className="workspace-notice switch-pending" role="status">
  <div className="workspace-notice-icon">{needsQuit?<PauseCircle size={19}/>:<RefreshCw size={19} className="spin"/>}</div>
  <div><strong>{pending.stage==='waiting'?'Quit Codex to switch':needsQuit?'Finish quitting Codex':pending.stage==='restarting'?'Loading your saved account':'Preparing your workspace'}{needsQuit&&selected?` · ${privacy.profileName(selected)} is queued`:''}</strong>
  <p>{privacy.text(pending.message)}</p></div>
  {pending.stage!=='switching'&&<button className="secondary" onClick={onCancel}><X size={14}/> Cancel switch</button>}
 </section>;
}
