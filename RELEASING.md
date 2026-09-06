# Version and release workflow

Every change is a Git commit. A release groups tested changes under a version; do not publish a release for every edit or automatically call the alpha stable.

## Choosing a number

- Patch: bug fix or small compatible polish, e.g. `1.0.0` → `1.0.1`.
- Minor: new compatible feature or meaningful improvement, e.g. `1.0.0` → `1.1.0`.
- Major: breaking behavior/data compatibility or a major product generation, e.g. `1.1.0` → `2.0.0`.
- Prerelease: append `-alpha.2`, `-beta.1`, etc. while acceptance is incomplete.

This is a SemVer-inspired desktop-product policy. The project is still in initial development: the existing download is `v0.1.0-alpha.1`; initial manifests use `0.1.0`. The next alpha should use an explicit version such as `0.1.0-alpha.2` in every manifest. The initial mismatch between the public prerelease label and earlier build is documented, not rewritten.

## Prepare a release

Start with a clean working tree. For a branch, run `git switch -c release/0.1.0-alpha.2`.

```powershell
pnpm version:prepare 0.1.0-alpha.2
# After stability: pnpm version:prepare patch (or minor / major)
pnpm version:check
pnpm test
pnpm build
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
```

The command synchronizes package.json, Tauri configuration, Cargo.toml, the root Cargo.lock entry, and the app's displayed version; it creates a dated changelog entry from Unreleased. It does not commit, push, tag, publish, or overwrite old downloads. Review generated changes and document the actual features/fixes before committing. Update the README download link for the new release.

Then build the Windows artifact from the exact commit you will tag, test it, and prepare a clean package with the license, setup instructions, and checksums. Keep credentials and user data out. Real account-switch acceptance is required before claiming switching is production-ready.

```powershell
git add <reviewed-files>
git commit -m "Release 0.1.0-alpha.2"
git push -u origin HEAD
# Merge the release branch first if one was used.
git switch main
git pull --ff-only
git tag -a v0.1.0-alpha.2 -m "Draey Codex Hub 0.1.0-alpha.2"
git push origin v0.1.0-alpha.2
# Attach the tested files and notes through GitHub Releases or gh release create.
```

Use prerelease status for alpha/beta builds. Never move published tags or replace an old version with a changed executable: publish a new version instead. `main` accepts direct maintainer pushes; feature branches and PRs remain available. GitHub CI checks manifest consistency on each push/PR, but does not automatically choose a release number or publish binaries.
