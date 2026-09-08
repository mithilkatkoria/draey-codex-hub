import { useSyncExternalStore } from 'react';
import { native, nativeAvailable, onNative } from './native';

type UpdateInfo={version:string;currentVersion:string;notes?:string};
type State={phase:'idle'|'checking'|'current'|'available'|'downloading'|'installing'|'error';update?:UpdateInfo;percent?:number;error?:string};
let state:State={phase:'idle'};
const listeners=new Set<()=>void>();
const publish=(next:State)=>{state=next;listeners.forEach(fn=>fn());};
export const useUpdates=()=>useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>state);
export async function checkUpdates() {
 if(['checking','downloading','installing'].includes(state.phase))return;
 publish({phase:'checking'});
 try {const update=await native<UpdateInfo|null>('check_update');publish(update?{phase:'available',update}:{phase:'current'});}
 catch(error){publish({phase:'error',error:String(error)});}
}
export async function installUpdate() {
 if(state.phase!=='available'||!state.update)return;
 const update=state.update;publish({phase:'downloading',update});
 let off=()=>{};
 try {
  off=await onNative<{received:number;total?:number;installing?:boolean}>('update-progress',p=>publish({phase:p.installing?'installing':'downloading',update,percent:p.total?Math.min(100,Math.round(p.received/p.total*100)):undefined}));
  await native('install_update');
 } catch(error){publish({phase:'error',error:String(error)});}
 finally {off();}
}
export function startUpdateCheck() {
 if(!nativeAvailable)return ()=>{};
 const timer=setTimeout(()=>void checkUpdates(),8000);
 return()=>clearTimeout(timer);
}
