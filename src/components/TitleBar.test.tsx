// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {TitleBar} from './TitleBar';
const win=vi.hoisted(()=>({minimize:vi.fn(),toggleMaximize:vi.fn(),close:vi.fn(),isMaximized:vi.fn(),onResized:vi.fn()}));
vi.mock('../services/native',()=>({nativeAvailable:true}));
vi.mock('@tauri-apps/api/window',()=>({getCurrentWindow:()=>win}));
beforeEach(()=>{vi.resetAllMocks();win.isMaximized.mockResolvedValue(false);win.onResized.mockResolvedValue(vi.fn());});
afterEach(cleanup);
it('routes window controls and command search to their separate actions',async()=>{
 const search=vi.fn();render(<TitleBar onSearch={search} onError={vi.fn()} closeToTray/>);
 fireEvent.click(screen.getByRole('button',{name:/Find an account/}));expect(search).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Minimize window'}));expect(win.minimize).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Maximize window'}));expect(win.toggleMaximize).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Close window'}));expect(win.close).toHaveBeenCalledOnce();
 await waitFor(()=>expect(win.onResized).toHaveBeenCalledOnce());
});
it('shows restore state and reports a native action failure',async()=>{
 win.isMaximized.mockResolvedValue(true);win.toggleMaximize.mockRejectedValue(new Error('unavailable'));const error=vi.fn();
 render(<TitleBar onSearch={vi.fn()} onError={error} closeToTray={false}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Restore window'}));
 await waitFor(()=>expect(error).toHaveBeenCalledWith(expect.stringContaining('window control')));
});
