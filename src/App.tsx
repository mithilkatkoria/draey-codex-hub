import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, FolderOpen, Layers, Plus, RefreshCw, Settings2, X, Monitor } from 'lucide-react';
import { useHub, type HubView } from './stores/useHub';
import { StreamerModeProvider, StreamerModeControl, usePrivacy } from './components/StreamerMode';
import { WorkspaceNotice } from './components/WorkspaceNotice';
import { LaunchIntro } from './components/LaunchIntro';
import { AccountActivity } from './components/AccountActivity';
import { TitleBar } from './components/TitleBar';
import { ProfileCard } from './components/ProfileCard';
import { ProfileEditor } from './components/ProfileEditor';
import { Projects } from './components/Projects';
import { Settings } from './components/Settings';
import { CommandPalette, type Command as PaletteCommand } from './components/CommandPalette';
import { mockMode, native, nativeAvailable, onNative } from './services/native';
import { effectiveState } from './services/refresh';
import type { Profile } from './types';

export default function App() {
 const hub=useHub();
 return <StreamerModeProvider profiles={hub.store.profiles} projects={hub.store.projects}><HubContent hub={hub}/></StreamerModeProvider>;
}
function HubContent({hub}:{hub:HubView}) {
 const privacy=usePrivacy();
 const [accountFilter,setAccountFilter]=useState('all');
 const [page,setPage]=useState('dashboard');
 const [palette,setPalette]=useState(false);
 const [editor,setEditor]=useState<{profile?:Profile;existingHome?:string}>();
 const {store}=hub;
 const live=store.profiles.filter(p=>effectiveState(store.usageCache[p.id],hub.now,store.settings.refreshSeconds)==='live').length;
 const syncing=store.profiles.filter(p=>store.usageCache[p.id]?.state==='refreshing').length;
 const available=store.profiles.filter(p=>p.availability==='available').length;
 const profiles=[...store.profiles].sort((a,b)=>Number(a.availability!=='available')-Number(b.availability!=='available')||a.createdAt.localeCompare(b.createdAt));
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(p=>!p);}};
  window.addEventListener('keydown',key);
  let cleanup:(()=>void)|undefined;
  void onNative<string>('navigate',setPage).then(off=>cleanup=off);
  return()=>{window.removeEventListener('keydown',key);cleanup?.();};
 },[]);
 const commands:PaletteCommand[]=[
  {id:'overview',label:'Open accounts',detail:'Accounts and allowances',run:()=>setPage('dashboard')},
  {id:'projects',label:'Open projects',detail:'Saved project shortcuts',run:()=>setPage('projects')},
  {id:'refresh-all',label:'Refresh all usage',detail:'Request current allowances',run:()=>void hub.refreshAll()},
  {id:'add',label:'Add account',detail:'Connect another Codex account',run:()=>setEditor({})},
  {id:'settings',label:'Open settings',detail:'Preferences and diagnostics',run:()=>setPage('settings')},
 ];
 for(const p of profiles){
  commands.push({id:`launch-${p.id}`,label:`Open Codex: ${privacy.profileName(p)}`,detail:p.availability.replace('-',' '),run:()=>void hub.launch(p.id)},
   {id:`refresh-${p.id}`,label:`Refresh usage: ${privacy.profileName(p)}`,detail:'Request live limits from Codex',run:()=>void hub.refresh(p.id)});
  for(const project of store.projects)commands.push({id:`project-${project.id}-${p.id}`,label:`Open ${privacy.projectName(project)} with ${privacy.profileName(p)}`,detail:project.preferredProfileId===p.id?'Preferred for this project':p.availability.replace('-',' '),run:()=>void hub.launch(p.id,project.id)});
 }
 async function prepareFour(){
  try{
   const presets=[{name:'Pro',plan:'pro',accent:'violet'},{name:'Plus 1',plan:'plus',accent:'blue'},{name:'Plus 2',plan:'plus',accent:'mint'},{name:'Plus 3',plan:'plus',accent:'amber'}];
   for(const preset of presets){if(store.profiles.some(p=>p.name===preset.name))continue;await native('save_profile',{input:{...preset,id:null,availability:'available',existingHome:null}});}
   await hub.reload();void hub.refreshAll();
  }catch(e){hub.setError(String(e));}
 }
 const visibleProfiles=profiles.filter(p=>accountFilter==='all'||(accountFilter==='available'?p.availability==='available':p.availability!=='available'));
 const accountPage=page!=='projects'&&page!=='settings';
 if(hub.loadError)return <div className="app-shell"><TitleBar onSearch={()=>{}} onError={hub.setError} closeToTray={store.settings.minimizeToTray}/><main className="recovery-screen"><section className="settings-panel" role="alert"><h1>Unable to load accounts</h1><p>{privacy.detail(hub.loadError)}</p><p>Your saved files have been preserved.</p><button className="primary" onClick={()=>void hub.retryLoad()}><RefreshCw size={16}/> Retry</button><StreamerModeControl/></section></main></div>;
 return <div className={`app-shell ${store.settings.reducedMotion?'reduced-motion':''} density-${store.settings.density}`}>
  <LaunchIntro reducedMotion={store.settings.reducedMotion}/><TitleBar onSearch={()=>setPalette(true)} onError={hub.setError} closeToTray={store.settings.minimizeToTray}/>
  <aside className="sidebar">
   <div className="workspace-label">Workspace</div>
   <nav aria-label="Main navigation">
    <button className={accountPage?'selected':''} aria-current={accountPage?'page':undefined} onClick={()=>setPage('dashboard')}><Layers size={17}/>Accounts<span>{profiles.length}</span></button>
    <button className={page==='projects'?'selected':''} aria-current={page==='projects'?'page':undefined} onClick={()=>setPage('projects')}><FolderOpen size={17}/>Projects<span>{store.projects.length}</span></button>
   </nav>
   <div className="sidebar-bottom">
    <StreamerModeControl/>
    <button className={`settings-nav ${page==='settings'?'selected':''}`} aria-current={page==='settings'?'page':undefined} onClick={()=>setPage('settings')}><Settings2 size={17}/>Settings</button>
    <div className="device-label"><Monitor size={13}/>Stored on this device</div>
    <div className="version"><span>v0.1.0-alpha.3 · Windows</span></div>
   </div>
  </aside>
  <main className="workspace-main">
   {mockMode&&<div className="mode-banner">Development preview · Simulated data</div>}
   {!nativeAvailable&&!mockMode&&<div className="mode-banner">Browser preview · Connect accounts in the Windows app</div>}
   <div className="main-content">
    <WorkspaceNotice workspace={hub.workspace} profiles={store.profiles} onCancel={()=>void hub.cancelSwitch()}/>
    <div className="page-content" key={page}>
     {page==='settings'?<Settings hub={hub}/>:page==='projects'?<><div className="page-heading"><div className="eyebrow">Workspace</div><h1>Projects</h1><p>Open a folder with the account you choose.</p></div><Projects hub={hub}/></>:<>
      <div className="dashboard-heading">
       <div className="page-heading"><div className="eyebrow">Your workspace</div><h1>A little room to focus.</h1><p>{profiles.length} saved accounts · {available} available · Your next session, one click away.</p></div>
       <div className="heading-actions"><button className="secondary refresh-all" aria-label="Refresh all accounts" onClick={()=>void hub.refreshAll()} disabled={!profiles.length||syncing===profiles.length}><RefreshCw size={14} className={syncing?'spin':''}/><span>Refresh</span></button><button className="primary" onClick={()=>setEditor({})}><Plus size={15}/>Add account</button></div>
      </div>
      {!profiles.length&&hub.loaded?<section className="onboarding">
       <div className="empty-symbol"><Layers size={25}/></div><h2>Connect your first account</h2><p>See real usage limits and keep your existing Codex projects in one place.</p>
       <button className="primary" onClick={()=>setEditor({})}>Connect account<ArrowRight size={15}/></button>
       {hub.installation?.existingHome&&<button className="text-button" onClick={()=>setEditor({existingHome:hub.installation!.existingHome!})}>Use existing Codex login<ArrowUpRight size={14}/></button>}
       <div className="detection-note"><i className={hub.installation?.desktop?'connection-dot':'neutral-dot'}/>{hub.installation?.desktop?'Codex Desktop detected':hub.installation?'Locate Codex in Settings':'Checking installation…'}</div>
       {nativeAvailable&&<button className="text-button prepare-accounts" onClick={()=>void prepareFour()}>Set up four account slots</button>}
      </section>:<section className="accounts-section" aria-label="Saved accounts">
       <div className="account-toolbar"><div className="account-tabs" aria-label="Filter accounts">{[{id:'all',label:'All',count:profiles.length},{id:'available',label:'Available',count:available},{id:'reserved',label:'Reserved',count:profiles.length-available}].map(tab=><button key={tab.id} aria-pressed={accountFilter===tab.id} onClick={()=>setAccountFilter(tab.id)}>{tab.label}<span>{tab.count}</span></button>)}</div>
        <div className="sync-summary" role="status"><i className={syncing?'connection-dot pulse':live===profiles.length&&live?'connection-dot':'neutral-dot'}/>{syncing?'Refreshing…':live===profiles.length&&live?'All limits up to date':`${live} of ${profiles.length} live`}</div></div>
       <div className="list-labels" aria-hidden="true"><span>Account</span><span>Remaining allowance</span><span>Launch</span></div>
       <div className="profile-grid">{visibleProfiles.map(p=><ProfileCard key={p.id} profile={p} snapshot={store.usageCache[p.id]} settings={store.settings} now={hub.now} active={hub.workspace?.activeProfileId===p.id} busy={hub.busy[p.id]} onLaunch={()=>void hub.launch(p.id)} onRefresh={()=>void hub.refresh(p.id)} onEdit={()=>setEditor({profile:p})} onLogin={()=>void hub.login(p.id)}/>)}{!hub.loaded&&[1,2,3].map(n=><div className="loading-card" key={n} aria-label="Loading account"><i/><i/><i/></div>)}</div>
       {hub.loaded&&!visibleProfiles.length&&<div className="filter-empty">No {accountFilter} accounts.<button className="text-button" onClick={()=>setAccountFilter('all')}>Show all accounts</button></div>}
       <div className="list-footer"><span>{store.settings.autoRefresh?`Updates every ${store.settings.refreshSeconds}s`:'Automatic refresh off'}</span><span>Usage supplied by Codex</span></div>
      </section>}
      <AccountActivity hub={hub}/><Projects hub={hub} compact/>
     </>}
    </div>
   </div>
  </main>
  {hub.error&&<div className="toast error-toast" role="alert"><div><strong>Unable to complete this action</strong><p>{privacy.detail(hub.error)}</p></div><button className="icon-button" aria-label="Dismiss error" onClick={()=>hub.setError('')}><X size={16}/></button></div>}
  {Object.entries(hub.busy).filter(([,s])=>s.includes('sign-in')).map(([id,s])=><div className="login-toast" key={id} role="status"><RefreshCw size={15} className="spin"/><span>{privacy.text(store.profiles.find(p=>p.id===id)?.name)} · {privacy.text(s)}</span><button className="text-button" onClick={()=>void native('cancel_login',{id})}>Cancel</button></div>)}
  {editor&&<ProfileEditor profile={editor.profile} existingHome={editor.existingHome} hub={hub} onClose={()=>setEditor(undefined)}/>}
  {palette&&<CommandPalette commands={commands} onClose={()=>setPalette(false)}/>}
 </div>;
}
