import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextVersion,prepare,readVersions} from './version.mjs';
const fixture={
 'package.json':'{"version":"1.0.0"}',
 'src-tauri/tauri.conf.json':'{"version":"1.0.0","app":{"windows":[{"decorations":false}]}}',
 'src-tauri/Cargo.toml':'[package]\nname = "draey-codex-hub"\nversion = "1.0.0"\n[dependencies]\nserde = "1"\n',
 'src-tauri/Cargo.lock':'[[package]]\nname = "draey-codex-hub"\nversion = "1.0.0"\n\n[[package]]\nname = "other"\nversion = "7.0.0"\n',
 'src/App.tsx':'<span>v1.0.0 · Windows</span>',
 'CHANGELOG.md':'# Changelog\n\n## [Unreleased]\n\n### Added\n- Feature.\n\n## [1.0.0]\n- Original.\n[Unreleased]: old\n'
};
test('patch, feature and major numbering',()=>{assert.equal(nextVersion('1.0.0','patch'),'1.0.1');assert.equal(nextVersion('1.0.0','minor'),'1.1.0');assert.equal(nextVersion('1.1.0','major'),'2.0.0');assert.throws(()=>nextVersion('1.0.0','0.9.0'));assert.throws(()=>nextVersion('1.0.0','1.01.0'));});
test('updates all manifests and changelog while preserving settings/dependencies',()=>{const r=prepare(fixture,'minor','2026-09-06');assert.equal(readVersions(r.files),'1.1.0');assert.match(r.files['src-tauri/Cargo.toml'],/version = "1.1.0"\n/);assert.match(r.files['src-tauri/Cargo.lock'],/name = "other"\nversion = "7.0.0"/);assert.equal(JSON.parse(r.files['src-tauri/tauri.conf.json']).app.windows[0].decorations,false);assert.match(r.files['src/App.tsx'],/v1.1.0/);assert.match(r.files['CHANGELOG.md'],/## \[1.1.0\] - 2026-09-06/);assert.match(r.files['CHANGELOG.md'],/## \[1.0.0\]/);});
test('rejects inconsistent versions before preparing files',()=>{assert.throws(()=>prepare({...fixture,'package.json':'{"version":"2.0.0"}'},'patch','today'));});
test('allows the next alpha explicitly, never silently promotes prereleases',()=>{assert.equal(nextVersion('0.1.0','0.1.0-alpha.2'),'0.1.0-alpha.2');assert.throws(()=>nextVersion('0.1.0-alpha.2','minor'));});

test('rejects prerelease regressions and stable downgrades',()=>{assert.throws(()=>nextVersion('1.0.0','1.0.0-alpha.1'));assert.throws(()=>nextVersion('0.1.0-alpha.10','0.1.0-alpha.2'));assert.equal(nextVersion('0.1.0-alpha.2','0.1.0-alpha.10'),'0.1.0-alpha.10');});
