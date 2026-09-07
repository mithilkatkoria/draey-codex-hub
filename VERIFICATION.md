# Verification status

Updated 7 September 2026. This document separates observed behavior from pending acceptance.

## Account handoff implemented

All normal launches use the existing `~/.codex` workspace and default Codex Desktop data. No separate Electron directory is supplied. Project files, task databases, sidebar state, and configuration remain in place; only file-based `auth.json` credentials are transferred.

For a different saved account while Codex is open, the Hub waits for sign-out or a manual quit. After sign-out, it checks the missing authentication file and a fresh app-server `account/read` response, requests the normal Quit action for the default Codex window, and waits for exit. It does not kill Codex. The latest development changes choose an unowned Electron application window rather than an arbitrary visible auxiliary window. If Codex remains open, an actionable notice appears after ten seconds and the account stays queued for up to ten minutes. Other accounts can refresh during this wait. Cancellation or timeout leaves authentication unchanged.

The selected login is activated only after exit, verified with Codex app-server, and retained in its saved slot. Failure before launch restores the prior login. The Hub keeps matching saved credentials current between usage refreshes while open or in the tray. Backups stay in local Hub application data and are never exported.

## Passed in this development session

Latest checks on 7 September: 27 frontend tests, 20 native tests, and 5 version-tool tests passed. The optimized x64 executable and NSIS installer built successfully with the transparent icon and completed streamer-mode changes.

- Native tests cover credential rotation and A/B/A handoff using fixtures, logout preservation, rollback, workspace-file preservation, process classification, protocol launch settings, usage parsing, and recovery from Windows package storage. These are fixtures, not real Desktop account-switch acceptance.
- Frontend tests cover independent startup requests, cache aging, dynamic Pro windows, missing-value handling, switch cancellation, window controls, and command search. Regression tests verify that Connect account remains a login action while an expired account's cached limits refresh, and that an account waiting for Codex to quit remains cancelable.
- 5 release-tool tests: manifest and displayed-version updates, version progression, and changelog preparation.
- Frontend production build and native embedded-UI Windows debug build.
- Four real saved accounts refreshed independently on native Hub startup. Actual plans included Plus, Team, and Pro (`prolite`), with distinct account-specific windows.
- Read-only process check identified one default Desktop instance. Separate command-line or environment-based Desktop profiles are excluded from normal close requests.
- At 14:21 UTC, the native Hub usage probe and Codex's own usage tool reported the same weekly use (37%), both reset timestamps, and two available reset credits. Session use was 26% then 27% in successive live responses while this task was consuming usage. This was not an identical simultaneous snapshot.
- Native UI: maximize/restore state, settings navigation, installation diagnostics, preferences save, and Ctrl+K individual refresh were exercised. The dashboard uses real data; screenshots containing personal identities are not included in the public repository.
- Recovered four saved profiles and one project from Windows' virtualized Codex-package storage into `%USERPROFILE%\.draey-codex-hub`; original profile files were preserved.
- An explicit Explorer launch produced an independent Hub process with Explorer ancestry, outside Codex's descendant process tree. The new automatic Explorer handoff is compiled but has not been live verified.
- The final native release build opened with all four saved profiles and one project, and all four profiles reached live usage automatically on startup.
- At 05:52 UTC on 7 September, the native parser and Codex's own usage tool agreed exactly: 53% session used, 72% weekly used, resets at 1788777663 and 1789246616, and two reset credits. These are recorded observations, not production fallback values.
- Native streamer-mode visual check: Auto detected ShareX and masked all four identities and the project path; manual On retained masking. On/Off rendering with synthetic identities and paths was checked in the earlier browser preview. Automated tests cover manual Off without exposing real account details during this native check.
- The Windows icon was regenerated from the SVG. Pixel inspection confirmed alpha 0 at its outer background and centre, and alpha 255 on the silhouette.

## Pending real acceptance

A completed sign-out → selected saved account → restarted Desktop → original sidebar → switch back has **not yet been observed** in this session. The latest user screenshots showed successful live limits for a reconnected profile, but the Desktop quit step timed out. The subsequent window selection and queued-wait changes still need live acceptance. Fixture tests and file identity do not prove the account cached inside a running Desktop.

An earlier native host/process verification was blocked by automatic approval review with a workspace-credit error. On 7 September the approved retry passed: one default Codex Desktop instance was detected with a normal Quit target. A separate process-ancestry check confirmed the running Hub was a direct Explorer child. These read-only checks do not prove a completed account switch.

The current task itself runs inside Codex. An actual restart interrupts it, so resume the task after checking the reopened account. Windows Codex also closes its descendant processes; the Hub must be launched independently. Development source now attempts an Explorer handoff before starting Tauri when launched inside the Codex package. Do not describe the alpha as production-certified account switching until the live checks pass.

Other independent CLI sessions are not controlled by the Hub. Finish their work before changing shared authentication. Keyring and automatic credential stores are deliberately rejected for switching without modifying configuration.

## Manual acceptance

1. Keep the updated Hub open and finish work in Codex.
2. Sign out inside Codex, then click a connected saved account in the Hub. Alternatively, choose the account first and follow the notice.
3. Let Codex quit normally; respond to any unfinished-work prompt. If it remains in the background, choose File > Quit (Ctrl+Q). The selected account should remain queued and launch after exit without another Hub click. Confirm other profiles continue refreshing during the wait.
4. Confirm the reopened Codex account is the selected identity, the original sidebar projects and tasks remain, and no new browser login is required.
5. Repeat with the previous saved account and confirm its identity too.
6. Compare usage windows for that account at the same time. Record differences rather than assuming a successful process launch proves account switching.
