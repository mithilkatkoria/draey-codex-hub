# Verification status

Updated 6 September 2026. This document separates observed behavior from pending acceptance.

## Account handoff implemented

All normal launches use the existing `~/.codex` workspace and default Codex Desktop data. No separate Electron directory is supplied. Project files, task databases, sidebar state, and configuration remain in place; only file-based `auth.json` credentials are transferred.

For a different saved account while Codex is open, the Hub waits for sign-out or a manual quit. After sign-out, it checks the missing authentication file and a fresh app-server `account/read` response, sends a normal close request to the default Codex window, and waits for exit. It does not kill Codex. If Codex stays in the background or asks about unfinished work, the user must finish quitting; timeout leaves authentication unchanged.

The selected login is activated only after exit, verified with Codex app-server, and retained in its saved slot. Failure before launch restores the prior login. The Hub keeps matching saved credentials current between usage refreshes while open or in the tray. Backups stay in local Hub application data and are never exported.

## Passed in this development session

- 16 native tests: credential rotation and A/B/A handoff using fixtures, logout preservation, rollback, workspace-file preservation, process classification, protocol launch settings, usage parsing, and storage recovery.
- 13 frontend tests: independent startup requests, cache aging, dynamic Pro windows, missing-value handling, switch cancellation, window controls, and command search.
- 5 release-tool tests: manifest and displayed-version updates, version progression, and changelog preparation.
- Frontend production build and native embedded-UI Windows debug build.
- Four real saved accounts refreshed independently on native Hub startup. Actual plans included Plus, Team, and Pro (`prolite`), with distinct account-specific windows.
- Read-only process check identified one default Desktop instance. Separate command-line or environment-based Desktop profiles are excluded from normal close requests.
- At 14:21 UTC, the native Hub usage probe and Codex's own usage tool reported the same weekly use (37%), both reset timestamps, and two available reset credits. Session use was 26% then 27% in successive live responses while this task was consuming usage. This was not an identical simultaneous snapshot.
- Native UI: maximize/restore state, settings navigation, installation diagnostics, preferences save, and Ctrl+K individual refresh were exercised. The dashboard uses real data; screenshots containing personal identities are not included in the public repository.

## Pending real acceptance

A completed sign-out → selected saved account → restarted Desktop → original sidebar → switch back has **not yet been observed** in this session. Fixture tests and file identity do not prove the account cached inside a running Desktop. The test build has been opened for the user; the manual sign-out/reopened identity check is pending.

The current task itself runs inside Codex. An actual restart interrupts it, so resume the task after checking the reopened account. Do not describe the alpha as production-certified account switching until that check passes.

Other independent CLI sessions are not controlled by the Hub. Finish their work before changing shared authentication. Keyring and automatic credential stores are deliberately rejected for switching without modifying configuration.

## Manual acceptance

1. Keep the updated Hub open and finish work in Codex.
2. Sign out inside Codex, then click a connected saved account in the Hub. Alternatively, choose the account first and follow the notice.
3. Let Codex close normally; respond to any unfinished-work prompt. If closing to the background prevents exit, quit from Codex's menu and retry.
4. Confirm the reopened Codex account is the selected identity, the original sidebar projects and tasks remain, and no new browser login is required.
5. Repeat with the previous saved account and confirm its identity too.
6. Compare usage windows for that account at the same time. Record differences rather than assuming a successful process launch proves account switching.
