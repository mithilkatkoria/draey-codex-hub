import { ArrowUpRight, RefreshCw, LockKeyhole, MoreHorizontal, ShieldCheck, Clock3, RotateCcw, ChevronDown, Zap } from 'lucide-react';
import type { Profile, Snapshot, Settings, UsageWindow } from '../types';
import { age, effectiveState } from '../services/refresh';
import { presentWindows, resetDate, resetRemaining } from '../services/usagePresentation';

export function ProfileCard({profile:p,snapshot,settings,now,active=false,busy,onLaunch,onRefresh,onEdit,onLogin}:{profile:Profile;snapshot?:Snapshot;settings:Settings;now:number;active?:boolean;busy?:string;onLaunch:()=>void;onRefresh:()=>void;onEdit:()=>void;onLogin:()=>void}) {
  const state = effectiveState(snapshot,now,settings.refreshSeconds);
  const reserved = p.availability !== 'available';
  const live = state === 'live';
  const cached = !!snapshot?.fetchedAt && !live;
  const visible = settings.showStale || live;
  const {core,additional} = presentWindows(p,visible ? snapshot?.windows ?? [] : []);
  const [hero,...secondary] = core;
  const auth = state === 'auth-required' || p.connection === 'auth-required' && !snapshot?.fetchedAt;
  const exhausted = live && core.some(w => w.remainingPercent === 0);
  const resets = visible ? snapshot?.resetCredits : undefined;
  const count = resets?.availableCount;
  const banked = resets?.credits?.filter(c => c.status === 'available') ?? [];
  const nextExpiry = banked.map(c=>c.expiresAt).filter((n):n is number=>n!=null).sort((a,b)=>a-b)[0] ?? null;
  const plan = p.actualPlan ?? p.plan;
  const percent = (w: UsageWindow) => w.remainingPercent == null ? null : Math.max(0,Math.min(100,w.remainingPercent));

  function windowMeter(w: UsageWindow, featured = false) {
    const value = percent(w);
    return <div className={`allowance ${featured?'allowance-featured':''}`} key={w.id}>
      <div className="allowance-heading"><span>{w.label}{featured && <small> allowance</small>}</span>{!featured && <strong>{value == null ? '—' : `${Math.round(value)}%`}<small> left</small></strong>}</div>
      {featured && <div className="allowance-value"><strong>{value == null ? '—' : Math.round(value)}{value != null && <small>%</small>}</strong><span>remaining</span><svg className="allowance-orbit" viewBox="0 0 80 80" aria-hidden="true"><circle className="orbit-track" cx="40" cy="40" r="31"/><circle className="orbit-value" cx="40" cy="40" r="31" pathLength="100" strokeDasharray={`${value??0} 100`}/></svg></div>}
      <div className={`allowance-track ${value===0?'depleted':''}`} role="meter" aria-label={`${w.bucket} ${w.label} remaining`} aria-valuenow={value??undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={value==null?'Not reported':`${Math.round(value)}% remaining`}><i style={{width:`${value??0}%`}}/></div>
      <div className="allowance-reset" title={resetDate(w.resetsAt)}><Clock3 size={12}/><span>{w.resetsAt!=null&&w.resetsAt*1000>now?'Resets in ':''}<strong>{resetRemaining(w.resetsAt,now)}</strong></span></div>
      {featured && w.resetsAt!=null && <time className="reset-calendar" dateTime={new Date(w.resetsAt*1000).toISOString()}>{resetDate(w.resetsAt)}</time>}
    </div>;
  }

  return <article className={`profile-card accent-${p.accent} ${active?'is-current':''} ${reserved?'reserved':''} ${exhausted?'is-exhausted':''}`}>
    <div className="card-top"><div className="identity"><div className="avatar">{p.name.slice(0,1)}</div><div><div className="identity-title"><h3>{p.name}</h3><span className="plan-chip">{plan === 'prolite' ? 'Pro' : plan}</span></div><span className="plan" title={p.accountEmail??undefined}>{p.accountEmail??'Codex account'}</span></div></div><button className="icon-button" aria-label={`Settings for ${p.name}`} onClick={onEdit}><MoreHorizontal size={19}/></button></div>
    <div className="card-state"><span className={`status status-${state}`}><i className={state==='refreshing'?'pulse':''}/>{state.replace('-',' ')}</span>{reserved?<span className="reservation-tag"><LockKeyhole size={11}/>{p.availability==='friend-priority'?'Friend priority':'Reserved'}</span>:<span className="availability-tag">{active?'Current workspace':auth?'Sign-in needed':exhausted?'Allowance reached':'Available'}</span>}</div>
    <div className="card-usage">
      {hero ? windowMeter(hero,true) : <div className={`usage-empty ${state==='refreshing'?'skeleton':''}`}><div className="empty-orbit"><RefreshCw size={22} className={state==='refreshing'?'spin':''}/></div><strong>{state==='refreshing'?'Checking allowances':auth?'Connect your account':'Usage unavailable'}</strong><p>{auth?'Sign in once to see real limits.':'Each account reports its own allowances.'}</p></div>}
      {secondary.length>0 && <div className="secondary-allowances">{secondary.map(w=>windowMeter(w))}</div>}
      {additional.length>0 && <div className="model-allowances"><div className="model-allowances-heading"><Zap size={12}/><span>{additional.every(w=>/spark/i.test(w.bucket)||/spark/i.test(w.id))?'Spark allowances':'Additional model allowances'}</span></div>{additional.map(w=><div key={w.id}>{!(/spark/i.test(w.bucket)||/spark/i.test(w.id))&&<div className="model-name">{w.bucket}</div>}{windowMeter(w)}</div>)}</div>}
    </div>
    <details className="reset-bank"><summary><span className="reset-bank-icon"><RotateCcw size={15}/></span><span className="reset-bank-label">Banked resets<small>{count==null?'Not reported':`${count} available${cached?' · cached':''}`}</small></span><strong>{count??'—'}</strong><ChevronDown size={13} className="reset-bank-chevron"/></summary><div className="reset-bank-detail">{count==null?<p>Codex has not supplied a reset-credit balance for this account. This does not mean zero.</p>:<><p>These are saved usage-reset credits. Scheduled window resets above happen separately.</p>{banked.map((credit,i)=><div className="bank-credit" key={`${credit.title}-${i}`}><span>{credit.title||'Usage reset'}</span><small>{credit.expiresAt==null?'Expiry not reported':`Expires ${resetDate(credit.expiresAt)}`}</small></div>)}{nextExpiry!=null&&<p className="credit-expiry">Next expiry in {resetRemaining(nextExpiry,now)}</p>}</>}</div></details>
    {snapshot?.message && <p className="card-error" title={snapshot.message}>{snapshot.message.replace(/^(AUTH_REQUIRED|OFFLINE): /,'')}</p>}
    <div className="card-actions"><div className="sync-line"><span>{cached?'Last confirmed ':''}{snapshot?.fetchedAt?age(snapshot.fetchedAt,now):'Not synced'}</span><button className="icon-button" aria-label={`Refresh ${p.name}`} disabled={state==='refreshing'||!!busy} onClick={onRefresh}><RefreshCw size={13} className={state==='refreshing'?'spin':''}/></button></div>
    <button className={`launch-button ${reserved?'subdued':''}`} onClick={auth?onLogin:onLaunch} disabled={!!busy}><span>{busy || (auth?'Connect account':reserved?'OPEN ANYWAY':active?'Open current workspace':'Open Codex')}</span>{busy?<RefreshCw size={15} className="spin"/>:<ArrowUpRight size={17}/>}</button>
    </div><div className="card-bottom"><span>{reserved?'Reserved · you can choose to open':'Last opened '+age(p.lastUsedAt,now)}</span><ShieldCheck size={12}/></div>
  </article>;
}


