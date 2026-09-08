# Installing and updating

## For users

Download the setup EXE from this repository's GitHub Releases, run it, then search for **Draey Codex Hub** in Windows Start. Install Codex Desktop/CLI separately and connect your own accounts. The download never includes somebody else's accounts.

People using alpha.3 or earlier must install the newer setup manually once because their old executable has no updater. From alpha.4 onward, the Hub checks the public update feed shortly after startup. It shows a notice when a newer version is available. **Settings > App updates** also offers a manual check.

Choose **Download and install** when ready. The Hub verifies the update signature before starting the installer, closes, and the installer reopens it. Account sign-in or switching must finish first. The account store stays in the separate user folder. A portable copy is converted into an installed application when using this installer update path; the old downloaded EXE may remain in Downloads and should not be used afterward.

Failed checks or rejected signatures leave the installed app unchanged. You can always obtain the installer from GitHub Releases. Windows publisher signing and SmartScreen reputation are separate from the update signature; see [Windows signing](windows-signing.md).

## For maintainers

The embedded updater public key corresponds to the release owner's private key. Keep an offline backup of that private key. Never commit it or regenerate it for routine releases. Losing it prevents existing installations from trusting future updates signed with a different key.

The **Publish Windows update** workflow uses repository secrets `TAURI_SIGNING_PRIVATE_KEY` and optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Its public key is in `src-tauri/tauri.conf.json`. Configure secrets through GitHub's encrypted secrets interface, never in a source file.

1. Make and test changes, then commit them to `main`.
2. Prepare a new version with `pnpm version:prepare VERSION` (explicit alpha version while in prerelease). Update the changelog and verification notes; commit and push.
3. Run **Actions > Publish Windows update > Run workflow**. A normal push does not ship a new executable automatically.
4. The workflow tests and builds the app, signs the updater installer, creates versioned downloads, then commits `updates/latest.json` to `main`. Only a successfully published release advances the feed. If branch protection blocks that commit, merge the reviewed generated feed separately.
5. Confirm the release artifacts and update feed refer to the same version. Never change a published tag or replace its assets.

For a local release, provide `TAURI_SIGNING_PRIVATE_KEY`, run `pnpm package`, then `scripts/package-release.ps1`. Publish that version's assets, and only afterward copy its `latest.json` to `updates/latest.json` and push the feed.

The update channel currently follows the newest published Hub alpha. Signature verification is mandatory. The app uses the Tauri updater's HTTPS transport and rejects download URLs outside this project's GitHub release paths. No silent installation or forced account changes occur.
