import { expect, it } from 'vitest';
import { RequestPool } from './requestPool';
it('bounds concurrency and drains every account even after failures',async()=>{
 const pool=new RequestPool(3);let active=0,peak=0,completed=0;
 const jobs=Array.from({length:30},(_,i)=>pool.run(async()=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;completed++;if(i%4===0)throw Error('offline');}));
 await Promise.allSettled(jobs);expect(peak).toBe(3);expect(completed).toBe(30);
 await expect(pool.run(async()=>42)).resolves.toBe(42);
});
