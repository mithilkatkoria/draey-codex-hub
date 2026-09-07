import { Activity, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';
import { usePrivacy } from './StreamerMode';
import { age, effectiveState } from '../services/refresh';
import type { HubView } from '../stores/useHub';
export function AccountActivity({hub}:{hub:HubView}) {
 const privacy=usePrivacy();
 const updates=hub.store.profiles.map(p=>({p,s:hub.store.usageCache[p.id]})).filter(({p,s})=>!!s?.fetchedAt||!!p.lastUsedAt).sort((a,b)=>Math.max(Date.parse(b.s?.fetchedAt||'')||0,Date.parse(b.p.lastUsedAt||'')||0)-Math.max(Date.parse(a.s?.fetchedAt||'')||0,Date.parse(a.p.lastUsedAt||'')||0)).slice(0,4);
 if(!updates.length)return null;
 return <section className="activity-panel" aria-label="Latest account status"><div className="activity-heading"><Activity size={17}/><div><h2>Activity</h2><p>Latest confirmed account updates</p></div><span>On this device</span></div><div className="activity-items">{updates.map(({p,s})=>{const state=effectiveState(s,hub.now,hub.store.settings.refreshSeconds);const auth=p.connection==='auth-required'||state==='auth-required';const opened=!auth&&(Date.parse(p.lastUsedAt||'')||0)>(Date.parse(s?.fetchedAt||'')||0);const Icon=auth?AlertCircle:opened?ArrowUpRight:RefreshCw;return <div className={`activity-item accent-${p.accent}`} key={p.id}><span className={`activity-symbol ${auth?'attention':''}`}><Icon size={15}/></span><div><strong>{privacy.profileName(p)}</strong><span>{auth?'Sign-in needs attention':opened?'Codex launch requested':state==='live'?'Usage synced':'Last confirmed usage'}</span><small>{age(opened?p.lastUsedAt:s?.fetchedAt,hub.now)}</small></div></div>;})}</div></section>;
}
