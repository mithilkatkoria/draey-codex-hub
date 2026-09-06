import { describe,it,expect } from 'vitest';
import { RefreshCoordinator, effectiveState, countdown } from './refresh';
import type { Profile, Snapshot } from '../types';
const snapshot=(state:Snapshot['state']='live'):Snapshot=>({windows:[],fetchedAt:'2026-09-06T00:00:00Z',source:'test fixture',state,message:null});
describe('live synchronization',()=>{
 it('starts all profiles independently and retains a failed profile’s confirmed cache',async()=>{
  const snapshots:Record<string,Snapshot>={b:snapshot('stale')};const calls:string[]=[];let release!:()=>void;
  const c=new RefreshCoordinator(async id=>{calls.push(id);if(id==='a')await new Promise<void>(r=>release=r);if(id==='b')throw Error('Offline');return snapshot();},id=>snapshots[id],(id,s)=>snapshots[id]=s);
  const all=c.all([{id:'a'},{id:'b'},{id:'c'}] as Profile[]);
  expect(calls).toEqual(['a','b','c']);await Promise.resolve();await Promise.resolve();
  expect(snapshots.c.state).toBe('live');expect(snapshots.a.state).toBe('refreshing');expect(snapshots.b.state).toBe('error');expect(snapshots.b.fetchedAt).toBe('2026-09-06T00:00:00Z');release();await all;expect(snapshots.a.state).toBe('live');
 });
 it('deduplicates an in-flight manual refresh',async()=>{let count=0;let release!:()=>void;const c=new RefreshCoordinator(async()=>{count++;await new Promise<void>(r=>release=r);return snapshot();},()=>undefined,()=>{});const first=c.refresh('a');const second=c.refresh('a');expect(count).toBe(1);release();await Promise.all([first,second]);});
 it('ages live data into stale without inventing values',()=>{expect(effectiveState(snapshot(),Date.parse('2026-09-06T00:03:00Z'))).toBe('stale');expect(effectiveState(undefined)).toBe('unavailable');expect(effectiveState(snapshot('offline'))).toBe('offline');});
 it('updates reset countdown locally and never promises a reset already happened',()=>{expect(countdown(7200,0)).toBe('Resets in 2h 0m');expect(countdown(1,2000)).toContain('awaiting sync');expect(countdown(null)).toContain('unavailable');});
});
