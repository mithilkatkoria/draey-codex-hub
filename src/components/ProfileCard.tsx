import { memo, type CSSProperties } from 'react';
import { ArrowUpRight, RefreshCw, LockKeyhole, MoreHorizontal, ChevronDown, Zap, Layers3, Box, Sparkles, Diamond, Clock3, Monitor, Crown, AlertCircle } from 'lucide-react';
import { usePrivacy } from './StreamerMode';
import type { Profile, Snapshot, Settings, UsageWindow } from '../types';
import { age, effectiveState } from '../services/refresh';
import { presentWindows, resetDate, resetRemaining } from '../services/usagePresentation';

type Props={profile:Profile;snapshot?:Snapshot;settings:Settings;now:number;active?:boolean;busy?:string;onLaunch:()=>void;onRefresh:()=>void;onEdit:()=>void;onLogin:()=>void};
export const ProfileCard=memo(function ProfileCard({profile:p,snapshot,settings,now,active=false,busy,onLaunch,onRefresh,onEdit,onLogin}:Props) {
 const privacy=usePrivacy();
 const name=privacy.profileName(p);
 const state=effectiveState(snapshot,now,settings.refreshSeconds);
 const reserved=p.availability!=='available';
 const live=state==='live';
 const cached=!!snapshot?.fetchedAt&&!live;
 const {core,additional}=presentWindows(p,settings.showStale||live?snapshot?.windows??[]:[]);
 const auth=state==='auth-required'||p.connection==='auth-required';
 const exhausted=live&&core.some(w=>w.remainingPercent===0);
 const resets=settings.showStale||live?snapshot?.resetCredits:undefined;
 const banked=resets?.credits?.filter(c=>c.status==='available')??[];
 const plan=p.actualPlan??p.plan;
 const Symbol=p.accent==='violet'?Sparkles:p.accent==='mint'?Box:p.accent==='amber'?Diamond:Layers3;
 function meter(w:UsageWindow,ring=true) {
  const value=w.remainingPercent==null?null:Math.max(0,Math.min(100,w.remainingPercent));
  const warning=value!=null&&value<=15;
  return <div className={`quota ${warning?'quota-low':''} ${ring?'quota-with-ring':'quota-wide'}`} key={w.id} style={{'--quota-value':value??0} as CSSProperties}>
   {ring&&<div className="quota-ring" aria-hidden="true"><svg viewBox="0 0 80 80"><circle className="ring-track" cx="40" cy="40" r="34"/><circle className="ring-value" cx="40" cy="40" r="34" pathLength="100" strokeDasharray={`${value??0} 100`}/></svg><strong>{value==null?'N/A':`${Math.round(value)}%`}</strong></div>}
   <div className="quota-copy"><div className="quota-heading"><span>{w.label}</span>{!ring&&<strong>{value==null?'N/A':`${Math.round(value)}%`}</strong>}</div><span className="quota-caption">remaining{cached?' · cached':''}</span>
    <div className="quota-segments" role="meter" aria-label={`${w.bucket} ${w.label} remaining`} aria-valuenow={value??undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={value==null?'Not reported':`${Math.round(value)}% remaining`}><i style={{width:`${value??0}%`}}/></div>
    <div className="quota-reset" title={resetDate(w.resetsAt)}><Clock3 size={12}/><span>{w.resetsAt!=null&&w.resetsAt*1000>now?'Resets in ':''}{resetRemaining(w.resetsAt,now)}</span></div>
   </div>
  </div>;
 }
 return <article className={`profile-card account-tile accent-${p.accent} ${active?'is-current':''} ${reserved?'reserved':''} ${auth?'needs-auth':''}`} aria-label={name}>
  <div className="portrait-top"><span className="plan-chip">{plan==='prolite'?'Pro':plan}</span><span className={`availability-chip ${reserved?'availability-reserved':''}`}>{reserved?'Reserved':'Available'}</span></div>
  <div className="portrait-art" aria-hidden="true"><div className="art-halo"/><Symbol size={76} strokeWidth={1.15}/></div>
  {reserved&&<div className="priority-strip"><Crown size={13}/>{p.availability==='friend-priority'?'Friend priority':'Reserved account'}<span><LockKeyhole size={11}/>Reserved</span></div>}
  <div className="tile-heading"><div className="identity"><div className="account-symbol" aria-hidden="true"><Symbol size={30} strokeWidth={1.6}/></div><div className="identity-copy"><div className="identity-title"><h3>{name}</h3><span className="plan-chip">{plan==='prolite'?'Pro':plan}</span></div><span className="plan" title={privacy.active?undefined:p.accountEmail??undefined}>{privacy.active?'Email hidden':p.accountEmail??'Codex account'}</span><div className="card-state"><span className={`status status-${state}`}><i/>{state.replace('-',' ')}</span>{active&&<span className="current-tag"><Monitor size={11}/>Current workspace</span>}{auth?<span className="attention-tag">Sign-in needed</span>:exhausted?<span className="attention-tag">Allowance reached</span>:additional.length>0?<span className="additional-hint"><Zap size={11}/>Extra allowances</span>:null}</div></div></div><button className="icon-button" aria-label={`Settings for ${name}`} onClick={onEdit}><MoreHorizontal size={18}/></button></div>
  <div className={`tile-quotas ${core.length===1?'single-quota':''}`}>{core.length?core.map(w=>meter(w,core.length!==1)):<div className="usage-empty"><strong>{state==='refreshing'?'Checking allowances':auth?'Connect your account':'Usage unavailable'}</strong><span>{auth?'Sign in to retrieve limits.':'No limits reported yet.'}</span></div>}</div>
  {additional.length>0&&<details className="tile-extra"><summary><Zap size={12}/><span>{additional.every(w=>/spark/i.test(w.bucket)||/spark/i.test(w.id))?'Spark allowances':'Additional model allowances'}</span><ChevronDown size={12}/></summary><div className="tile-extra-grid">{additional.map(w=><div key={w.id}><small className="model-name">{w.bucket}</small>{meter(w,false)}</div>)}</div></details>}
  {snapshot?.message&&<div className="tile-error"><AlertCircle size={15}/><p>{privacy.detail(snapshot.message.replace(/^(AUTH_REQUIRED|OFFLINE): /,''))}</p></div>}
  <div className="tile-footer"><div className="tile-sync"><button className="icon-button" aria-label={`Refresh ${name}`} disabled={state==='refreshing'||!!busy} onClick={onRefresh}><RefreshCw size={13} className={state==='refreshing'?'spin':''}/></button><span title={snapshot?.fetchedAt?`Last confirmed ${new Date(snapshot.fetchedAt).toLocaleString()}`:undefined}>{cached?'Cached · ':''}{snapshot?.fetchedAt?age(snapshot.fetchedAt,now):'Not synced'}</span></div><button className={`launch-button ${reserved?'subdued':''}`} onClick={auth?onLogin:onLaunch} disabled={!!busy}><span>{privacy.text(busy)||(auth?'Connect account':reserved?'Open anyway':'Open Codex')}</span>{busy?<RefreshCw size={14} className="spin"/>:<ArrowUpRight size={14}/>}</button></div>
  <details className="tile-bank"><summary><span>Banked resets</span><strong>{resets?.availableCount??'N/A'}</strong>{cached&&<small>cached</small>}<ChevronDown size={12}/></summary><div className="reset-bank-detail">{resets?.availableCount==null?<p>Codex has not reported a reset-credit balance.</p>:<><p>{resets.availableCount} available. Separate from scheduled resets.</p>{banked.map((credit,i)=><div className="bank-credit" key={i}><span>{privacy.active?'Usage reset':credit.title||'Usage reset'}</span><small>{credit.expiresAt==null?'Expiry not reported':`Expires ${resetDate(credit.expiresAt)}`}</small></div>)}</>}</div></details>
 </article>;
});
