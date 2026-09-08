// @vitest-environment jsdom
import { expect,it,vi,afterEach } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { defaultSettings,type Profile,type Snapshot } from '../types';
afterEach(cleanup);
const profile:Profile={id:'p',name:'Pro',plan:'pro',accent:'violet',home:'C:/p',desktopData:'C:/d',managed:true,availability:'friend-priority',createdAt:'',lastUsedAt:null,connection:'connected'};
const props={profile,settings:defaultSettings,now:0,onLaunch:vi.fn(),onRefresh:vi.fn(),onEdit:vi.fn(),onLogin:vi.fn()};
it('renders only actual Pro windows, keeps manual reserved override and labels stale data',()=>{const snapshot:Snapshot={state:'stale',fetchedAt:'1970-01-01T00:00:00Z',source:'test fixture',message:null,windows:[{id:'w',label:'Weekly',bucket:'codex',remainingPercent:72,usedPercent:28,resetsAt:1000,durationMins:10080}]};render(<ProfileCard {...props} snapshot={snapshot}/>);expect(screen.getByRole('meter',{name:'codex Weekly remaining'})).toBeDefined();expect(screen.queryByText('Session')).toBeNull();expect(screen.getByText('stale')).toBeDefined();expect(screen.getByRole('button',{name:/Open anyway/i})).toBeDefined();expect(screen.getByText(/Friend priority/)).toBeDefined();});
it('never generates allowance percentages when production data is absent',()=>{render(<ProfileCard {...props}/>);expect(screen.queryByRole('meter')).toBeNull();expect(screen.getByText('Usage unavailable')).toBeDefined();expect(screen.queryByText(/\d+%/)).toBeNull();});
it('shows precise used and remaining percentages with the actual window length and reset date',()=>{
 const snapshot:Snapshot={state:'live',fetchedAt:'1970-01-01T00:00:00Z',source:'fixture',message:null,windows:[{id:'w',label:'Weekly',bucket:'codex',remainingPercent:72.4,usedPercent:27.6,resetsAt:1000,durationMins:10080}]};
 const view=render(<ProfileCard {...props} snapshot={snapshot}/>);
 expect(screen.getByText('72.4%')).toBeDefined();expect(screen.getByText('27.6% used')).toBeDefined();expect(screen.getByText('7-day window')).toBeDefined();expect(view.container.querySelector('time')?.getAttribute('datetime')).toBe('1970-01-01T00:16:40.000Z');
});

it('keeps reconnect as the action while an expired login refreshes cached limits',()=>{const snapshot:Snapshot={state:'refreshing',fetchedAt:'1970-01-01T00:00:00Z',source:'test fixture',message:null,windows:[]};render(<ProfileCard {...props} profile={{...profile,connection:'auth-required'}} snapshot={snapshot}/>);expect(screen.getByRole('button',{name:'Connect account'})).toBeDefined();expect(screen.queryByRole('button',{name:/Open anyway/i})).toBeNull();});
