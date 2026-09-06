// Read-only integration probe. No auth files, tokens, raw responses or stderr are printed.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
const executable = process.argv[2];
const home = process.argv[3] || join(homedir(), '.codex');
if (!executable) throw new Error('Pass the absolute Codex CLI executable path.');
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CODEX_')));
env.CODEX_HOME = home;
const child = spawn(executable, ['app-server', '--listen', 'stdio://'], { env, cwd: home, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
const pending = new Map(); let nextId = 0;
const input = createInterface({ input: child.stdout });
input.on('line', line => {try {const value = JSON.parse(line); const p = pending.get(value.id); if (!p) return; pending.delete(value.id); if (value.error) p.reject(new Error(`Codex rejected request ${value.id}; code ${value.error.code}`)); else p.resolve(value.result);} catch { /* Non-protocol startup output is ignored. */ }});
function request(method, params = {}) {return new Promise((resolve,reject) => {const id=++nextId;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n');});}
const deadline=setTimeout(()=>{console.error('Probe timed out');child.kill();process.exitCode=1;},40000);
child.on('error',()=>{console.error('Codex process could not start');process.exitCode=1;});
try {
 await request('initialize',{clientInfo:{name:'draey_codex_hub_probe',version:'0.1.0'},capabilities:{experimentalApi:false}});
 child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
 const {account}=await request('account/read',{refreshToken:true});
 console.log(JSON.stringify({authentication:account?.type??null,plan:account?.planType??null,accountFields:Object.keys(account??{})}));
 const data=await request('account/rateLimits/read');
 const buckets=data.rateLimitsByLimitId??{codex:data.rateLimits};
 const safe=Object.fromEntries(Object.entries(buckets).map(([key,b])=>[key,b?{limitId:b.limitId,limitName:b.limitName,primary:b.primary?{usedPercent:b.primary.usedPercent,windowDurationMins:b.primary.windowDurationMins,resetsAt:b.primary.resetsAt}:null,secondary:b.secondary?{usedPercent:b.secondary.usedPercent,windowDurationMins:b.secondary.windowDurationMins,resetsAt:b.secondary.resetsAt}:null}:null]));
 console.log(JSON.stringify({fetchedAt:new Date().toISOString(),rateLimitsByLimitId:safe},null,2));
} catch(error) { console.error(error.message);process.exitCode=1; }
finally {clearTimeout(deadline);input.close();child.kill();}
