// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { visiblePolling } from './visiblePolling';
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('pauses hidden polling, resumes immediately and cleans up',async()=>{
 vi.useFakeTimers();let visibility='visible';
 vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility as DocumentVisibilityState);
 const action=vi.fn();const stop=visiblePolling(action,1000);
 await vi.advanceTimersByTimeAsync(1000);expect(action).toHaveBeenCalledTimes(1);
 visibility='hidden';document.dispatchEvent(new Event('visibilitychange'));
 await vi.advanceTimersByTimeAsync(10000);expect(action).toHaveBeenCalledTimes(1);
 visibility='visible';document.dispatchEvent(new Event('visibilitychange'));
 await vi.advanceTimersByTimeAsync(0);expect(action).toHaveBeenCalledTimes(2);
 stop();await vi.advanceTimersByTimeAsync(10000);expect(action).toHaveBeenCalledTimes(2);
});
it('does not overlap slow requests',async()=>{
 vi.useFakeTimers();vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
 let resolve!:()=>void;const action=vi.fn(()=>new Promise<void>(r=>resolve=r));
 const stop=visiblePolling(action,1000);await vi.advanceTimersByTimeAsync(5000);
 expect(action).toHaveBeenCalledTimes(1);resolve();await vi.advanceTimersByTimeAsync(1000);
 expect(action).toHaveBeenCalledTimes(2);stop();resolve();
});
