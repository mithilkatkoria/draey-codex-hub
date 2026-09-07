import { useEffect, useRef, useState } from 'react';
import { emptyStore, type Installation, type Snapshot, type Store, type Profile, type WorkspaceStatus, type WorkspaceSwitch } from '../types';
import { native, onNative } from '../services/native';
import { RefreshCoordinator } from '../services/refresh';
export function useHub() {
 const [store,setStore]=useState<Store>(structuredClone(emptyStore));
 const [installation,setInstallation]=useState<Installation>();
 const [workspace,setWorkspace]=useState<WorkspaceStatus>();
 const refreshWorkspace=()=>native<WorkspaceStatus>('workspace_status').then(setWorkspace).catch(()=>{});
 const [loaded,setLoaded]=useState(false);const [loadError,setLoadError]=useState('');const [error,setError]=useState('');const [now,setNow]=useState(Date.now());
 const [busy,setBusy]=useState<Record<string,string>>({});
 const ref=useRef(store);ref.current=store;
 const coordinator=useRef<RefreshCoordinator>(undefined);
 if(!coordinator.current) coordinator.current=new RefreshCoordinator(id=>native('refresh_usage',{id}),id=>ref.current.usageCache[id],(id,snapshot)=>setStore(s=>({...s,usageCache:{...s.usageCache,[id]:snapshot}})));
 async function reload(clearProfile?:string) {const next=await native<Store>('load_state');const merged={...next,usageCache:{...next.usageCache,...Object.fromEntries(Object.entries(ref.current.usageCache).filter(([id])=>id!==clearProfile&&next.profiles.some(p=>p.id===id)))}};ref.current=merged;setStore(merged);setLoadError('');return next;}
 useEffect(()=>{let cancelled=false;const disposers:(()=>void)[]=[];
  const subscribe=<T,>(name:string,handler:(p:T)=>void)=>{void onNative<T>(name,handler).then(off=>cancelled?off():disposers.push(off));};
  subscribe<{id:string;snapshot:Snapshot}>('usage-updated',({id,snapshot})=>setStore(s=>({...s,usageCache:{...s.usageCache,[id]:snapshot}})));
  subscribe<Profile>('profile-updated',profile=>setStore(s=>({...s,profiles:s.profiles.map(p=>p.id===profile.id?profile:p)})));
  for(const event of ['login-progress','launch-progress']) subscribe<{id:string;message:string}>(event,({id,message})=>setBusy(s=>({...s,[id]:message})));
  subscribe<string>('hub-error',setError);
  subscribe<WorkspaceSwitch|null>('workspace-switch',pending=>{setWorkspace(s=>({...s,home:s?.home??'',activeProfileId:s?.activeProfileId??null,pending}));if(!pending)void refreshWorkspace();});
  void refreshWorkspace();
  void native<Store>('load_state').then(s=>{if(cancelled)return;for(const v of Object.values(s.usageCache))v.state='stale';setStore(s);ref.current=s;setLoaded(true);void coordinator.current!.all(s.profiles);}).catch(e=>{if(!cancelled){setError(String(e));setLoadError(String(e));setLoaded(true);}});
  void native<Installation>('detect_codex').then(i=>{if(!cancelled)setInstallation(i);}).catch(()=>{});
  const tick=window.setInterval(()=>setNow(Date.now()),1000);
  const workspaceTick=window.setInterval(()=>{void refreshWorkspace();},3000);
  return()=>{cancelled=true;disposers.forEach(f=>f());clearInterval(tick);clearInterval(workspaceTick);};
 },[]);
 useEffect(()=>{if(!loaded)return;let last=Date.now();const run=()=>{last=Date.now();void coordinator.current!.all(ref.current.profiles);};const focus=()=>{if(ref.current.settings.refreshOnFocus&&Date.now()-last>=15000)run();};const timer=setInterval(()=>{if(ref.current.settings.autoRefresh&&document.visibilityState==='visible')run();},store.settings.refreshSeconds*1000);window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[loaded,store.settings.refreshSeconds]);
 async function launch(id:string,projectId:string|null=null){setError('');setBusy(s=>({...s,[id]:'Preparing profile…'}));try{const message=await native<string>('launch_profile',{id,projectId});await reload();setBusy(s=>({...s,[id]:message}));setTimeout(()=>{setBusy(s=>({...s,[id]:''}));void coordinator.current!.refresh(id);},1800);}catch(e){if(!String(e).startsWith('Account switch cancelled'))setError(String(e));setBusy(s=>({...s,[id]:''}));}finally{void refreshWorkspace();}}
 async function login(id:string){setError('');setBusy(s=>({...s,[id]:'Starting OpenAI sign-in…'}));try{await native('login_profile',{id});await reload(id);await coordinator.current!.refresh(id);}catch(e){if(!String(e).includes('Sign-in cancelled'))setError(String(e));}finally{setBusy(s=>({...s,[id]:''}));}}
 return{store,loadError,retryLoad:async()=>{try{await reload();await coordinator.current!.all(ref.current.profiles);}catch(e){setLoadError(String(e));}},workspace,cancelSwitch:()=>native('cancel_switch').catch(e=>setError(String(e))),installation,setInstallation,loaded,error,setError,now,busy,reload,launch,login,refresh:(id:string)=>coordinator.current!.refresh(id),refreshAll:()=>coordinator.current!.all(ref.current.profiles)};
}
export type HubView = ReturnType<typeof useHub>;
