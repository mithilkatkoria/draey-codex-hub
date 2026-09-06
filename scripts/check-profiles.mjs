// Runs the compiled native usage service for each saved profile independently.
// Prints only nickname, plan, identity-match result, and actual allowance windows.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
const store=JSON.parse(await readFile(join(process.env.LOCALAPPDATA,'dev.draey.codexhub','hub.json'),'utf8'));
const binary=resolve('src-tauri/target/debug/examples/verify_native.exe');
await Promise.allSettled(store.profiles.map(profile=>new Promise(resolve=>{
 const child=spawn(binary,['usage',profile.home],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',error='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>error+=b);
 child.on('error',()=>{console.log(JSON.stringify({profile:profile.name,error:'Cannot start native probe'}));resolve();});
 child.on('exit',code=>{if(code!==0){console.log(JSON.stringify({profile:profile.name,state:'not-confirmed',message:error.trim()}));resolve();return;}
  try{const data=JSON.parse(output);console.log(JSON.stringify({profile:profile.name,identityMatchesSavedProfile:!!profile.identityKey&&profile.identityKey.startsWith(data.identityFingerprint),plan:data.plan,...data.snapshot}));}catch{console.log(JSON.stringify({profile:profile.name,error:'Probe response was malformed'}));}resolve();
 });
})));
