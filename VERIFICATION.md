# Existing-workspace launcher correction

Updated 6 September 2026.

The user's corrected requirement is one existing Codex Desktop workspace across
all accounts. Separate desktop profiles must not be used for normal launches.

## Implemented

- Launch the installed Codex Desktop executable with the existing `~/.codex` home.
  Do not set a separate Electron user-data directory or `--user-data-dir`.
- Preserve projects, sidebar state, sessions, databases, and configuration in place.
  Account handoff transfers only `auth.json`.
- Opening the account already selected in the workspace invokes the normal
  Desktop single-instance handoff.
- Selecting a different account waits up to ten minutes for all Codex Desktop
  processes to exit. The Hub never terminates Desktop. The user can cancel.
- After Desktop exits, serialize the switch against Hub refresh/sign-in operations,
  back up outgoing authentication locally, update its matching saved account slot,
  atomically activate the selected authentication, and request a managed token
  refresh through `account/read` before opening the existing workspace.
- Restore outgoing authentication if verification fails before Desktop opens.
- Route usage requests for the active account to the existing workspace, avoiding
  reuse of stale refresh tokens in its dormant account slot.
- Local identity routing includes token subject and account/organization ID;
  decoded identity is only a routing hint, not proof of authentication.
- Keep unavailable reset-credit counts unavailable; no reset redemption is performed.

Authentication backups are stored under local Hub application data in
`auth-backups`. They contain sensitive Codex credentials and are never included
in Hub configuration exports or diagnostics. No credentials are logged.

## Verified

- Native regression tests: 13 passed, including A/B/A token rotation, preservation
  of project/task/config files, backup and rollback, refusing a running Desktop,
  and aborting if Desktop reopens during backup.
- Frontend tests: 10 passed, including independent startup refreshes, dynamic
  Pro windows, no fabricated missing values, command palette, and switch cancel UI.
- Native Hub startup: all four saved real accounts refreshed automatically.
- Read-only native check: all four saved authentication files were valid, and the
  existing workspace matched Plus 2 at that check. A later standalone-app check
  showed Plus 1 selected; this was not treated as proof of an A/B switch by this task.
- Clicking the current account in the Hub reused the existing Desktop process
  roots rather than creating another separate desktop profile.
- Clicking Plus 1 displayed the waiting state. Canceling cleared it and left
  the existing workspace account unchanged. No account switch was left queued.
- Visually inspected the native Hub with the workspace notice, four real account
  cards, dynamic allowances, and cancellation state.
- Standalone embedded-UI executable opened successfully from `artifacts` and
  refreshed all four real accounts. The subsequent custom-protocol native build
  completed successfully too.

## Not yet verified / limitations

- No completed real A/B/A Desktop account switch has been performed with this
  corrected launcher. Doing that requires quitting the Codex app hosting the
  current work, then checking the reopened app's actual identity and sidebar.
- File identity is not proof of the identity already cached by a running Desktop.
  If authentication was changed externally while Desktop was open, quit Desktop
  fully and reopen before relying on the selected account indication.
- Keyring/automatic credential stores are deliberately rejected; the existing
  configuration is preserved. The current machine uses file authentication.
- Other independent Codex CLI processes are not controlled by the Hub. Finish
  those before switching the shared home if they are using its authentication.
- A further live usage comparison was rejected by automatic approval review due
  to workspace credit exhaustion. That rejected operation was not retried through
  a different execution path.
- This is a test build, not a release-certified installer. Installer/release
  acceptance requires the full real account-switch check above.

## Manual acceptance

1. Finish work in Codex. Keep the Hub open.
2. Choose a different connected account in the Hub. Observe the waiting notice.
3. Quit all Codex Desktop instances, including old separate-profile windows.
4. Allow the Hub to reopen Codex. Confirm the displayed account, the original
   sidebar projects, and existing tasks. No fresh browser login should be needed.
5. Repeat with the previous account. Confirm both identity and original workspace.
6. Compare every reported usage window with Codex for the same account and time.

Build the standalone test executable with `pnpm tauri build --debug --no-bundle`
after adding the installed Rust toolchain's `bin` directory to PATH. The output is
`src-tauri/target/debug/draey-codex-hub.exe`.

The standalone executable visually tested in this task is
`artifacts/Draey Codex Hub - workspace fix.exe` (16,888,320 bytes).
SHA-256: `2A95AA9223538D6FF532667B5C26CBC96EB5E95265C7AA524A333437DE0157E3`.
