import { useState } from 'react';
import { FolderOpen, KeyRound, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { native } from '../services/native';
import type { Profile } from '../types';
import type { HubView } from '../stores/useHub';
export function ProfileEditor({profile,hub,onClose,existingHome}:{profile?:Profile;hub:HubView;onClose:()=>void;existingHome?:string}){
 const [name,setName]=useState(profile?.name??'');const [plan,setPlan]=useState(profile?.plan??'plus');const [accent,setAccent]=useState(profile?.accent??'blue');const [availability,setAvailability]=useState(profile?.availability??'available');const [error,setError]=useState('');const [saving,setSaving]=useState(false);const [removing,setRemoving]=useState(false);const [confirmation,setConfirmation]=useState('');
 async function submit(connect:boolean){setSaving(true);setError('');try{const p=await native<Profile>('save_profile',{input:{id:profile?.id??null,name,plan,accent,availability,existingHome:existingHome??null}});await hub.reload();onClose();if(connect)void hub.login(p.id);else void hub.refresh(p.id);}catch(e){setError(String(e));}finally{setSaving(false);}}
 return <Modal title={profile?'Profile settings':existingHome?'Add existing profile':'Add a Codex profile'} onClose={onClose}><form onSubmit={e=>{e.preventDefault();void submit(!profile&&!existingHome);}}>
  <p className="form-intro">{existingHome?'Save the current account. Your existing projects and tasks stay in Codex.':'Save an account once. Open it in your existing Codex workspace, with your projects and tasks in place.'}</p>
  <label>Profile name<input autoFocus value={name} maxLength={80} placeholder="e.g. Plus 2" onChange={e=>setName(e.target.value)} required/></label>
  <div className="form-row"><label>Plan label<select value={plan} onChange={e=>setPlan(e.target.value as Profile['plan'])}><option value="plus">ChatGPT Plus</option><option value="pro">ChatGPT Pro</option><option value="other">Other</option></select></label><label>Availability<select value={availability} onChange={e=>setAvailability(e.target.value as Profile['availability'])}><option value="available">Available</option><option value="reserved">Reserved</option><option value="friend-priority">Friend priority</option></select></label></div>
  <label>Profile accent</label><div className="swatches">{['blue','violet','mint','amber','rose'].map(c=><button type="button" aria-label={`${c} accent`} aria-pressed={accent===c} key={c} onClick={()=>setAccent(c)} className={`swatch accent-${c} ${accent===c?'selected':''}`}/>)}</div>
  {profile&&<div className="profile-tools"><button type="button" className="secondary" onClick={()=>{onClose();void hub.login(profile.id);}}><KeyRound size={14}/> Reconnect</button><button type="button" className="secondary" onClick={()=>void native('open_profile_folder',{id:profile.id}).catch(e=>setError(String(e)))}><FolderOpen size={14}/> Profile folder</button><button type="button" className="text-button danger" onClick={()=>setRemoving(!removing)}><Trash2 size={14}/> Remove</button></div>}
  {(existingHome||profile)&&<p className="path-note">{existingHome??profile?.home}</p>}
  {removing&&<div className="remove-panel"><p>Remove from Draey Codex Hub. Local Codex profile data will be kept.</p><label>Type “{profile?.name}” to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button type="button" disabled={confirmation!==profile?.name} className="secondary danger" onClick={async()=>{try{await native('remove_profile',{id:profile!.id,deleteData:false,confirmation});await hub.reload();onClose();}catch(e){setError(String(e));}}}>Remove from Hub</button></div>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="form-footer">{!profile&&!existingHome?<button type="button" className="text-button" disabled={saving} onClick={()=>void submit(false)}>Connect later</button>:<span><KeyRound size={13}/> Sign-in stays with OpenAI</span>}<button className="primary" disabled={saving}>{saving?'Saving…':profile?'Save changes':existingHome?'Add profile':'Save & connect'}<span>↗</span></button></div>
 </form></Modal>;
}
