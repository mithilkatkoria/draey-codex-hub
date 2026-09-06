// @vitest-environment jsdom
import { act,renderHook,waitFor,cleanup } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { emptyStore,type Profile,type Snapshot } from '../types';
const calls=vi.hoisted(()=>({native:vi.fn(),listen:vi.fn(async()=>()=>{})}));
vi.mock('../services/native',()=>({native:calls.native,onNative:calls.listen}));
import { useHub } from './useHub';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('renders profiles before startup requests finish and refreshes every account separately',async()=>{
 const resolvers:Record<string,(v:Snapshot)=>void>={};const requested:string[]=[];
 const store=structuredClone(emptyStore);store.profiles=['a','b','c','d','e'].map(id=>({id,name:id,connection:'connected'} as Profile));
 calls.native.mockImplementation((command:string,args?:{id:string})=>{
  if(command==='load_state')return Promise.resolve(store);
  if(command==='workspace_status')return Promise.resolve({home:'workspace',activeProfileId:'c',pending:null});
  if(command==='detect_codex')return Promise.resolve({desktop:null,cli:null});
  if(command==='refresh_usage'){const id=args!.id;requested.push(id);return new Promise<Snapshot>(r=>resolvers[id]=r);}
 });
 const {result}=renderHook(()=>useHub());await waitFor(()=>expect(result.current.loaded).toBe(true));expect(result.current.store.profiles).toHaveLength(5);expect(requested).toEqual(['a','b','c','d','e']);expect(result.current.store.usageCache.b.state).toBe('refreshing');
 await act(async()=>resolvers.a({windows:[],state:'live',fetchedAt:new Date().toISOString(),source:'test fixture',message:null}));expect(result.current.store.usageCache.a.state).toBe('live');expect(result.current.store.usageCache.b.state).toBe('refreshing');
});
