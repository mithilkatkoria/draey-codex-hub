// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {WorkspaceNotice} from './WorkspaceNotice';
afterEach(cleanup);
it('explains the pending switch and provides cancellation while Codex is still running',()=>{
 const cancel=vi.fn();
 render(<WorkspaceNotice profiles={[]} workspace={{home:'workspace',activeProfileId:null,pending:{id:'b',stage:'waiting',message:'Quit Codex when your work is saved.'}}} onCancel={cancel}/>);
 expect(screen.getByRole('status').textContent).toContain('Quit Codex');
 fireEvent.click(screen.getByRole('button',{name:'Cancel switch'}));expect(cancel).toHaveBeenCalledOnce();
});
it('does not offer cancellation once authentication is being committed',()=>{
 render(<WorkspaceNotice profiles={[]} workspace={{home:'workspace',activeProfileId:null,pending:{id:'b',stage:'switching',message:'Verifying account'}}} onCancel={()=>{}}/>);
 expect(screen.queryByRole('button')).toBeNull();
});
