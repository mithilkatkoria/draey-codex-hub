import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?$/;
export function nextVersion(current, input) {
  const match = semver.exec(current);
  if (!match) throw new Error('Invalid current version');
  let next = input;
  if (['patch','minor','major'].includes(input)) {
    if(match[4]) throw new Error('For a prerelease, specify the next full version explicitly.');
    const [a,b,c] = match.slice(1,4).map(Number);
    next = input === 'major' ? `${a+1}.0.0` : input === 'minor' ? `${a}.${b+1}.0` : `${a}.${b}.${c+1}`;
  }
  if (!semver.test(next) || next === current) throw new Error('Choose a different valid MAJOR.MINOR.PATCH[-prerelease] version.');
  const oldParts=current.split('-')[0].split('.').map(Number), newParts=next.split('-')[0].split('.').map(Number);
  for(let i=0;i<3;i++){if(newParts[i]>oldParts[i])break;if(newParts[i]<oldParts[i])throw new Error('Version must not go backwards.');}
  if(oldParts.join('.')===newParts.join('.')) {
    const oldPre=current.split('-').slice(1).join('-'), newPre=next.split('-').slice(1).join('-');
    if(!oldPre && newPre && current!=='0.1.0')throw new Error('Cannot downgrade a stable release to a prerelease.');
    if(oldPre && newPre) {
      const a=oldPre.split('.'),b=newPre.split('.');let higher=false;
      for(let i=0;i<Math.max(a.length,b.length);i++){
        if(a[i]===b[i])continue;
        if(a[i]===undefined){higher=true;break;}if(b[i]===undefined)break;
        const an=/^\d+$/.test(a[i]),bn=/^\d+$/.test(b[i]);
        higher=an&&bn?BigInt(b[i])>BigInt(a[i]):an&&!bn?true:!an&&bn?false:b[i]>a[i];break;
      }
      if(!higher)throw new Error('Prerelease must advance.');
    }
  }
  // The initial published alpha used 0.1.0 in its manifests; allow that documented transition.
  return next;
}
export function readVersions(files) {
  const pkg=JSON.parse(files['package.json']).version;
  const tauri=JSON.parse(files['src-tauri/tauri.conf.json']).version;
  const cargo=/\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/.exec(files['src-tauri/Cargo.toml'])?.[1];
  const lock=/\[\[package\]\]\s*\nname = "draey-codex-hub"\s*\nversion = "([^"]+)"/.exec(files['src-tauri/Cargo.lock'])?.[1];
  if(!semver.test(pkg)||[tauri,cargo,lock].some(v=>v!==pkg))throw new Error('Version mismatch between package.json, Tauri, Cargo.toml, or Cargo.lock.');
  return pkg;
}
export function prepare(files,input,date) {
  const current=readVersions(files), next=nextVersion(current,input), out={...files};
  for(const name of ['package.json','src-tauri/tauri.conf.json']) {
    out[name]=files[name].replace(/("version"\s*:\s*")[^"]+(")/,`$1${next}$2`);
  }
  out['src-tauri/Cargo.toml']=files['src-tauri/Cargo.toml'].replace(/(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(" )?/,(_,prefix,suffix)=>prefix+next+(suffix??''));
  out['src-tauri/Cargo.lock']=files['src-tauri/Cargo.lock'].replace(/(\[\[package\]\]\s*\nname = "draey-codex-hub"\s*\nversion = ")[^"]+/,`$1${next}`);
  out['src/App.tsx']=files['src/App.tsx'].replace(/v\d+\.\d+\.\d+(?:-[\w.-]+)?(?=\s*(?:\u00c2)?\u00b7\s*Windows)/g,`v${next}`);
  const heading='## [Unreleased]';
  if(!files['CHANGELOG.md'].includes(heading))throw new Error('CHANGELOG.md must contain an Unreleased section.');
  if(files['CHANGELOG.md'].includes(`## [${next}]`))throw new Error('Version already exists in changelog.');
  out['CHANGELOG.md']=files['CHANGELOG.md'].replace(heading,`${heading}\n\n### Pending\n- Record the next changes here.\n\n## [${next}] - ${date}`)
    .replace(/\[Unreleased\]: .*/,`[Unreleased]: https://github.com/mithilkatkoria/draey-codex-hub/compare/v${next}...main`)
    + `\n[${next}]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v${next}\n`;
  readVersions(out);
  return {version:next,files:out};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
    const names=['package.json','src-tauri/tauri.conf.json','src-tauri/Cargo.toml','src-tauri/Cargo.lock','src/App.tsx','CHANGELOG.md'];
    const files=Object.fromEntries(names.map(name=>[name,readFileSync(resolve(root,name),'utf8')]));
    if(process.argv[2]==='--check'){console.log(`Versions consistent: ${readVersions(files)}`);}
    else {
      if(!process.argv[2])throw new Error('Usage: pnpm version:prepare patch|minor|major|VERSION');
      if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim())throw new Error('Commit or stash existing changes before preparing a release.');
      const result=prepare(files,process.argv[2],new Date().toISOString().slice(0,10));
      const tags=execFileSync('git',['tag','--list',`v${result.version}`],{cwd:root,encoding:'utf8'}).trim();
      if(tags)throw new Error('Tag already exists; published versions must not be reused.');
      const written=[];
      try {for(const name of names){writeFileSync(resolve(root,name),result.files[name]);written.push(name);}}
      catch(error){for(const name of written)writeFileSync(resolve(root,name),files[name]);throw error;}
      console.log(`Prepared ${result.version}. Review the diff and changelog, test, then commit and tag. Nothing was published.`);
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
