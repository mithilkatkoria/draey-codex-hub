// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LaunchIntro } from './LaunchIntro';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('removes the launch overlay promptly while leaving app content mounted',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false}));
 const view=render(<><LaunchIntro reducedMotion={false}/><main>Ready workspace</main></>);
 expect(view.container.querySelector('.launch-intro')).not.toBeNull();
 expect(view.getByText('Ready workspace')).toBeDefined();
 act(()=>vi.advanceTimersByTime(2000));
 expect(view.container.querySelector('.launch-intro')).not.toBeNull();
 act(()=>vi.advanceTimersByTime(1300));
 expect(view.container.querySelector('.launch-intro')).toBeNull();
});
it('skips the intro for system or app reduced-motion preferences',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));
 const view=render(<LaunchIntro reducedMotion={false}/>);
 expect(view.container.querySelector('.launch-intro')).toBeNull();
 cleanup();vi.stubGlobal('matchMedia',()=>({matches:false}));
 const app=render(<LaunchIntro reducedMotion={true}/>);
 expect(app.container.querySelector('.launch-intro')).toBeNull();
});
