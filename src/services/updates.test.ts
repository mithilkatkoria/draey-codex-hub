// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const calls=vi.hoisted(()=>({native:vi.fn(),listen:vi.fn(async()=>()=>{})}));
vi.mock('./native',()=>({native:calls.native,nativeAvailable:true,onNative:calls.listen}));
beforeEach(()=>{vi.resetModules();calls.native.mockReset();calls.listen.mockClear();});
afterEach(()=>vi.useRealTimers());
it('checks after startup but never installs without an explicit action',async()=>{
 vi.useFakeTimers();calls.native.mockResolvedValue({version:'1.0.0',currentVersion:'0.1.0'});
 const u=await import('./updates');const stop=u.startUpdateCheck();
 await vi.advanceTimersByTimeAsync(7999);expect(calls.native).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(1);expect(calls.native).toHaveBeenCalledExactlyOnceWith('check_update');
 stop();await u.installUpdate();expect(calls.native).toHaveBeenLastCalledWith('install_update');
});
it('does not install after a failed or empty update check',async()=>{
 const u=await import('./updates');calls.native.mockRejectedValueOnce(Error('Offline'));
 await u.checkUpdates();await u.installUpdate();expect(calls.native).toHaveBeenCalledTimes(1);
 calls.native.mockResolvedValue(null);await u.checkUpdates();await u.installUpdate();expect(calls.native).toHaveBeenCalledTimes(2);
});
it('deduplicates checks and allows retry after installation fails',async()=>{
 const u=await import('./updates');let resolve!:(x:unknown)=>void;
 calls.native.mockImplementationOnce(()=>new Promise(r=>resolve=r));
 const first=u.checkUpdates();await u.checkUpdates();expect(calls.native).toHaveBeenCalledTimes(1);
 resolve({version:'1.0.0',currentVersion:'0.1.0'});await first;
 calls.native.mockRejectedValueOnce(Error('Signature rejected'));await u.installUpdate();
 calls.native.mockResolvedValue(null);await u.checkUpdates();expect(calls.native).toHaveBeenLastCalledWith('check_update');
});
