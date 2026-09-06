import type { Profile, Snapshot, UsageState } from '../types';
export function effectiveState(snapshot: Snapshot | undefined, now = Date.now(), seconds = 60): UsageState {
 if (!snapshot) return 'unavailable';
 if (snapshot.state === 'live' && (!Number.isFinite(Date.parse(snapshot.fetchedAt)) || now-Date.parse(snapshot.fetchedAt) > Math.max(90,seconds*2)*1000)) return 'stale';
 return snapshot.state;
}
export function countdown(epoch: number | null, now = Date.now()): string {
 if (epoch == null) return 'Reset time unavailable';
 const mins=Math.ceil((epoch*1000-now)/60000);
 if (mins<=0) return 'Reset due · awaiting sync';
 if (mins<60) return `Resets in ${mins}m`;
 if (mins<1440) return `Resets in ${Math.floor(mins/60)}h ${mins%60}m`;
 return `Resets ${new Date(epoch*1000).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})}`;
}
export function age(iso: string | null | undefined, now = Date.now()): string { if (!iso) return 'Never'; const seconds=Math.max(0,Math.floor((now-Date.parse(iso))/1000)); if (!Number.isFinite(seconds)) return 'Unknown'; return seconds<10?'just now':seconds<60?`${seconds}s ago`:seconds<3600?`${Math.floor(seconds/60)}m ago`:seconds<86400?`${Math.floor(seconds/3600)}h ago`:`${Math.floor(seconds/86400)}d ago`; }
export class RefreshCoordinator {
 private pending = new Map<string, Promise<void>>();
 constructor(private fetch: (id:string)=>Promise<Snapshot>, private read: (id:string)=>Snapshot|undefined, private publish: (id:string,snapshot:Snapshot)=>void) {}
 refresh(id:string): Promise<void> {
  const pending=this.pending.get(id); if(pending) return pending;
  const before=this.read(id);
  this.publish(id,{windows:[],fetchedAt:'',source:'Codex app-server',message:null,...before,state:'refreshing'});
  const operation=(async()=>{try{this.publish(id,await this.fetch(id));}catch(error){this.publish(id,{windows:[],fetchedAt:'',source:'Codex app-server',...before,state:'error',message:String(error instanceof Error?error.message:error)});}finally{this.pending.delete(id);}})();
  this.pending.set(id,operation);return operation;
 }
 all(profiles:Profile[]) { return Promise.allSettled(profiles.map(p=>this.refresh(p.id))); }
}
