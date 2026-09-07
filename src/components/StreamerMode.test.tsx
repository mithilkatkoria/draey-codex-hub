// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StreamerModeProvider, StreamerModeControl, usePrivacy } from './StreamerMode';
import { ProfileCard } from './ProfileCard';
import { Projects } from './Projects';
import { ProfileEditor } from './ProfileEditor';
import { Settings } from './Settings';
import { WorkspaceNotice } from './WorkspaceNotice';
import { CommandPalette } from './CommandPalette';
import { defaultSettings, type Profile, type Project, type Snapshot } from '../types';
import type { HubView } from '../stores/useHub';
const calls=vi.hoisted(()=>({native:vi.fn()}));
vi.mock('../services/native',()=>({native:calls.native,nativeAvailable:true}));
const profile:Profile={id:'p1',name:'Secret identity',accountEmail:'private.person@example.com',home:'C:\\Users\\Private Person\\home',desktopData:'C:\\Users\\Private Person\\desktop',plan:'plus',accent:'blue',managed:true,availability:'reserved',createdAt:'2026-01-01',lastUsedAt:null,connection:'connected'};
const project:Project={id:'j1',name:'Confidential client',path:'C:\\Users\\Private Person\\project',preferredProfileId:profile.id,pinned:true,lastOpenedAt:null};
const snapshot:Snapshot={windows:[],fetchedAt:'2026-01-01',source:'fixture',state:'error',message:'Private Person diagnostic for '+profile.accountEmail};
const hub={store:{profiles:[profile],projects:[project],settings:defaultSettings,usageCache:{}},now:0,busy:{},installation:{existingHome:profile.home,desktop:profile.desktopData,cli:profile.home},workspace:{home:profile.home},launch:vi.fn(),reload:vi.fn(),refreshAll:vi.fn()} as unknown as HubView;
const noop=()=>{};
function StateProbe(){const p=usePrivacy();return <><output data-testid="active">{String(p.active)}</output><button onClick={()=>p.setPreference('on')}>Force privacy</button><button onClick={()=>p.setPreference('off')}>Reveal</button></>;}
function wrap(children:React.ReactNode){return <StreamerModeProvider profiles={[profile]} projects={[project]}><StreamerModeControl/><StateProbe/>{children}</StreamerModeProvider>;}
beforeEach(()=>{
  localStorage.clear();calls.native.mockReset();calls.native.mockImplementation(async command=>command==='detect_recording_apps'?[]:{});
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('keeps details hidden until detection resolves, then updates as a recorder starts and stops',async()=>{
  vi.useFakeTimers();let resolve!:(apps:string[])=>void;
  calls.native.mockImplementation(command=>command==='detect_recording_apps'?new Promise<string[]>(r=>{resolve=r;}):Promise.resolve());
  render(wrap(null));expect(screen.getByTestId('active').textContent).toBe('true');
  await act(async()=>resolve([]));expect(screen.getByTestId('active').textContent).toBe('false');
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);resolve(['OBS Studio']);});
  expect(screen.getByTestId('active').textContent).toBe('true');
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);resolve([]);});
  expect(screen.getByTestId('active').textContent).toBe('false');
});
it('offers Auto, On and Off, persists manual choice and does not let detection override Off',async()=>{
  calls.native.mockImplementation(async command=>command==='detect_recording_apps'?['OBS Studio']:{});
  const view=render(wrap(null));
  fireEvent.click(screen.getByRole('button',{name:/Streamer mode:.*Options/}));
  fireEvent.click(screen.getByRole('button',{name:'Off'}));
  await waitFor(()=>expect(screen.getByTestId('active').textContent).toBe('false'));
  expect(localStorage.getItem('draey.streamer-mode.v1')).toBe('off');
  view.unmount();render(wrap(null));expect(screen.getByTestId('active').textContent).toBe('false');
  fireEvent.click(screen.getByText('Force privacy'));
  expect(screen.getByTestId('active').textContent).toBe('true');
  expect(calls.native).toHaveBeenCalledWith('set_streamer_privacy',{active:true});
});
it('defaults to hiding when detection fails',async()=>{
  calls.native.mockRejectedValue(new Error('Cannot inspect processes'));
  render(wrap(null));await screen.findByText('Detection unavailable · hidden');
  expect(screen.getByTestId('active').textContent).toBe('true');
});
it('hides again if a later recorder check hangs',async()=>{
  vi.useFakeTimers();render(wrap(null));
  await act(async()=>{});
  expect(screen.getByTestId('active').textContent).toBe('false');
  calls.native.mockImplementation(command=>command==='detect_recording_apps'?new Promise(()=>{}):Promise.resolve());
  await act(async()=>{await vi.advanceTimersByTimeAsync(9000);});
  expect(screen.getByTestId('active').textContent).toBe('true');
});
it('masks identity, tooltips, projects and messages without changing launch IDs or saved values',()=>{
  localStorage.setItem('draey.streamer-mode.v1','on');
  const before=JSON.stringify({profile,project});
  const view=render(wrap(<><ProfileCard profile={profile} snapshot={snapshot} settings={defaultSettings} now={0} onLaunch={noop} onRefresh={noop} onEdit={noop} onLogin={noop}/><Projects hub={hub}/><WorkspaceNotice profiles={[profile]} workspace={{home:profile.home,activeProfileId:profile.id,pending:{id:'s',stage:'waiting',message:`Ready for ${profile.name} at ${profile.home}`}}} onCancel={noop}/></>));
  for(const value of [profile.name,profile.accountEmail!,profile.home,project.name,project.path,'Private Person'])expect(view.container.innerHTML).not.toContain(value);
  fireEvent.click(screen.getByRole('button',{name:'Open'}));
  expect(hub.launch).toHaveBeenCalledWith(profile.id,project.id);
  expect(JSON.stringify({profile,project})).toBe(before);
  fireEvent.click(screen.getByText('Reveal'));
  expect(screen.getByText(profile.accountEmail!)).toBeDefined();
});
it('removes already-open form values when privacy activates',async()=>{
  localStorage.setItem('draey.streamer-mode.v1','off');
  const view=render(wrap(<ProfileEditor profile={profile} hub={hub} onClose={noop}/>));
  expect(screen.getByDisplayValue(profile.name)).toBeDefined();
  fireEvent.click(screen.getByText('Force privacy'));
  expect(view.container.innerHTML).not.toContain(profile.name);
  expect(view.container.innerHTML).not.toContain(profile.home);
  expect((screen.getByDisplayValue('Name hidden') as HTMLInputElement).disabled).toBe(true);
});
it('masks settings placeholders and diagnostics, and prevents file dialogs during protection',async()=>{
  localStorage.setItem('draey.streamer-mode.v1','on');
  calls.native.mockImplementation(async command=>command==='detect_recording_apps'?[]:{email:profile.accountEmail,path:project.path});
  const view=render(wrap(<Settings hub={hub}/>));
  fireEvent.click(screen.getByRole('button',{name:'Run diagnostics'}));
  await screen.findByText(/Details hidden by streamer mode/);
  for(const value of [profile.name,profile.accountEmail!,profile.home,project.path])expect(view.container.innerHTML).not.toContain(value);
  expect((screen.getByRole('button',{name:'Choose desktopExe'}) as HTMLButtonElement).disabled).toBe(true);
});
it('uses safe command labels and clears a private search when switching on',()=>{
  localStorage.setItem('draey.streamer-mode.v1','off');
  const view=render(wrap(<CommandPalette commands={[{id:'one',label:`Open ${profile.name}`,detail:project.path,run:noop}]} onClose={noop}/>));
  fireEvent.change(screen.getByRole('combobox'),{target:{value:profile.accountEmail}});
  fireEvent.click(screen.getByText('Force privacy'));
  expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('');
  for(const value of [profile.name,profile.accountEmail!,project.path])expect(view.container.innerHTML).not.toContain(value);
});
