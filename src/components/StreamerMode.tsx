import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ShieldCheck, ShieldOff, ChevronDown } from 'lucide-react';
import { native, nativeAvailable } from '../services/native';
import { privacyEnabled, redactPrivateText, type RecorderDetection, type StreamerPreference } from '../services/privacy';
import type { Profile, Project } from '../types';
import './streamer.css';

const preferenceKey = 'draey.streamer-mode.v1';
function savedPreference(): StreamerPreference {
  try { const value = localStorage.getItem(preferenceKey); return value === 'on' || value === 'off' ? value : 'auto'; }
  catch { return 'auto'; }
}
const initialDetection: RecorderDetection = { state:'checking', apps:[] };
const defaults = {
  active:false, preference:'auto' as StreamerPreference, detection:initialDetection, persistenceError:false,
  setPreference:(_value:StreamerPreference)=>{},
  profileName:(p:Pick<Profile,'id'|'name'>)=>p.name,
  projectName:(p:Pick<Project,'id'|'name'>)=>p.name,
  text:(s:string|null|undefined)=>s??'',
  detail:(s:string|null|undefined)=>s??'',
};
const PrivacyContext = createContext(defaults);
export const usePrivacy = () => useContext(PrivacyContext);

export function StreamerModeProvider({profiles,projects,children}:{profiles:Profile[];projects:Project[];children:ReactNode}) {
  const [preference,setPreferenceState] = useState(savedPreference);
  const [detection,setDetection] = useState(initialDetection);
  const [persistenceError,setPersistenceError] = useState(false);
  const active = privacyEnabled(preference,detection);
  function setPreference(value:StreamerPreference) {
    setPreferenceState(value);
    try { localStorage.setItem(preferenceKey,value);setPersistenceError(false); }
    catch { setPersistenceError(true); }
  }
  useEffect(()=>{
    let disposed=false; let timer:ReturnType<typeof setTimeout>;
    async function poll() {
      let deadline:ReturnType<typeof setTimeout>|undefined;
      try {
        if (!nativeAvailable) throw new Error('Desktop only');
        const apps=await Promise.race([
          native<string[]>('detect_recording_apps'),
          new Promise<never>((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Detection timed out')),4000);}),
        ]);
        if(!disposed)setDetection({state:'ready',apps});
      } catch { if(!disposed)setDetection({state:'unavailable',apps:[]}); }
      finally { clearTimeout(deadline); }
      if(!disposed)timer=setTimeout(()=>void poll(),5000);
    }
    void poll();
    return ()=>{disposed=true;clearTimeout(timer);};
  },[]);
  // Keep tray aliases in Auto even if WebView timers pause while minimized.
  useEffect(()=>{if(nativeAvailable)void native('set_streamer_privacy',{active:preference!=='off'}).catch(()=>{});},[preference]);
  const value=useMemo(()=>{
    const secrets=[...profiles.flatMap(p=>[p.name,p.accountEmail??'',p.home,p.desktopData]),...projects.flatMap(p=>[p.name,p.path])];
    const accountOrder=[...profiles].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    const projectOrder=[...projects].sort((a,b)=>a.id.localeCompare(b.id));
    return {active,preference,detection,persistenceError,setPreference,
      profileName:(p:Pick<Profile,'id'|'name'>)=>active?`Account ${Math.max(0,accountOrder.findIndex(x=>x.id===p.id))+1}`:p.name,
      projectName:(p:Pick<Project,'id'|'name'>)=>active?`Project ${Math.max(0,projectOrder.findIndex(x=>x.id===p.id))+1}`:p.name,
      text:(s:string|null|undefined)=>active?redactPrivateText(s??'',secrets):s??'',
      detail:(s:string|null|undefined)=>active&&s?'Details hidden by streamer mode. Turn it off to inspect.':s??'',
    };
  },[active,preference,detection,persistenceError,profiles,projects]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function StreamerModeControl() {
  const p=usePrivacy();const [expanded,setExpanded]=useState(false);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};
    window.addEventListener('keydown',close);
    return ()=>window.removeEventListener('keydown',close);
  },[expanded]);
  const status=p.preference==='on'?'On manually':p.preference==='off'?'Off manually':p.detection.state==='checking'?'Checking apps · hidden':p.detection.state==='unavailable'?'Detection unavailable · hidden':p.detection.apps.length?'Recording app detected':'No supported app detected';
  return <div className={`streamer-control ${p.active?'streamer-active':''}`}>
    {expanded&&<section className="streamer-popover" aria-label="Streamer mode options">
      <strong>Keep private details off screen</strong>
      <p>Hide emails, names, folder paths and diagnostic details in the Hub.</p>
      <div className="streamer-options" role="group" aria-label="Streamer mode preference">{(['auto','on','off'] as const).map(mode=><button key={mode} aria-pressed={p.preference===mode} onClick={()=>p.setPreference(mode)}>{mode==='auto'?'Auto':mode==='on'?'On':'Off'}</button>)}</div>
      <p role="status">{status}{p.detection.apps.length>0&&` (${p.detection.apps.join(', ')})`}</p>
      <small>Auto checks every 5 seconds for OBS, Streamlabs, XSplit and other supported capture apps. Running does not necessarily mean recording. Browser capture and other apps may not be detected. Choose On before sharing for continuous protection.</small>
      <small>Only the Hub is masked. Codex, browser sign-in, file dialogs and exported files are outside this protection.</small>
      {p.persistenceError&&<small role="alert">This choice could not be saved for the next launch.</small>}
      <button className="text-button" onClick={()=>setExpanded(false)}>Done</button>
    </section>}
    <button className="streamer-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} aria-label={`Streamer mode: ${p.active?'on':'off'}. Options`}>
      {p.active?<ShieldCheck size={17}/>:<ShieldOff size={17}/>}<span>Streamer mode<small>{status}</small></span><ChevronDown size={13}/>
    </button>
  </div>;
}
