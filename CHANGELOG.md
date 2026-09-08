# Changelog

All published releases receive an immutable Git tag and an entry here. Unreleased work is not a claim that the downloadable binary includes it.

## [Unreleased]

### Pending
- Record the next changes here.

## [0.1.0-alpha.4] - 2026-09-08

### Added
- Signature-verified in-app updates, a startup availability check, explicit download/install control, progress, retry states, and a GitHub update feed.
- A manual GitHub Actions release workflow using the encrypted updater signing key. Public release assets are published before the update feed advances.
- User setup/update instructions and a separate Windows publisher-signing guide.

### Changed
- Lengthened the grayscale D introduction to 3.2 seconds while accounts continue loading underneath. Reduced-motion preferences still skip it.
- Sculpted transparent SVG crown, orbit, cube, and ribbon artwork on vertical account cards.
- Show used and remaining percentages to one decimal where reported, actual allowance window length, reset countdown, and exact local reset date. Pro keeps its reported windows.

Windows Authenticode publisher signing is not yet configured. Update signatures do not remove Unknown publisher or guarantee immediate SmartScreen reputation. Users on alpha.3 and earlier need one manual upgrade. Full real A/B/A Desktop acceptance remains pending.

## [0.1.0-alpha.3] - 2026-09-07

### Changed
- Redesigned the app around adaptive vertical account cards, SVG usage rings, segmented allowance bars, distinct account symbols, a navy palette, and responsive settings and dialogs.
- Added a brief grayscale D-logo entrance and fade-out while accounts load underneath. System and app reduced-motion settings skip it.
- Added an activity summary from confirmed usage and launch timestamps. Reduced periodic UI clock updates from every second to every 15 seconds. No animation library or video assets are bundled.
- Balance one, three, four, or more accounts without a fixed account limit. Keep all saved accounts intact.
- Bound concurrent usage requests to three, including tray refreshes, and suspend display polling while hidden.
- Add a GitHub releases button and manual update instructions in Settings.
- Put extra model windows and banked-reset details behind expandable controls while keeping primary allowances visible.
- Switching now verifies the selected login and requests normal Quit without asking users to sign out. Sign-out can revoke saved credentials.

### Fixed
- Retry rejected usage once through Codex managed-token refresh before asking for another browser login.
- Connect account rechecks an existing saved login before starting Google or OpenAI sign-in.
- Network errors mentioning authentication no longer automatically mark an account disconnected.
- Keep streamer-mode controls within the minimum supported window height.
- Correct local profile verification to use the stable user-folder store and the active account's current workspace credentials.

The Windows installer provides a Start menu shortcut. Previously revoked logins need one reconnect. Full real A/B/A Desktop acceptance remains pending.

## [0.1.0-alpha.2] - 2026-09-06

### Fixed
- Recover existing profiles from Windows package storage into one stable user-folder store; preserve the original files.
- Keep Connect account bound to sign-in while an expired account's cached allowances refresh.
- Preserve login-completion notifications received before the RPC response and match completion to the requested login.
- Detach packaged Hub launches through Explorer so Codex quitting does not also close the Hub. Automatic startup handoff still needs live acceptance.
- Keep a selected account queued when normal quit needs attention, allow independent usage refresh during that wait, and keep button progress labels short.
- Detect Codex sign-out while an account switch is waiting and request a normal restart of the default Desktop window before loading the saved login.
- Preserve refreshed credentials in the matching saved account slot before logout removes the workspace login.
- Avoid waiting for unrelated isolated Desktop instances; reject unreadable process state instead of assuming Codex is closed.
- Keep Node release-tool tests separate from Vitest dashboard tests.

The signed-out restart flow still requires real Desktop acceptance; no production-readiness claim is made.

### Added
- Streamer mode with local recorder-app detection, persistent Auto/On/Off controls, consistent account aliases, and masking across the dashboard, tray, editors, tooltips, commands, and diagnostics.
- A transparent folded D icon for the Windows executable, tray, and title bar, with no background tile.
- Finished native window controls, responsive graphite dashboard, account filters, and readable allowance cards.
- Multi-account usage guide, FAQ, and repository discovery metadata.
- Copyright/attribution and project-identity guidance.
- Version preparation command and CI consistency check.
- Release and contribution workflow documentation.

## [0.1.0-alpha.1] - 2026-09-06

### Added
- First public Windows test download and MIT-licensed source repository.
- Real per-account allowance refresh with plan-specific windows.
- Existing-workspace launch, queued account handoff, and cancellation.
- Project shortcuts, tray, settings, and command palette.

### Known limitations
- Full real A/B/A account-switch acceptance is pending.
- Unsigned test executable; no signed installer.
- Initial download predates the documentation commit tagged with this release; it is not claimed to be a reproducible artifact of that tag.

[Unreleased]: https://github.com/mithilkatkoria/draey-codex-hub/compare/v0.1.0-alpha.4...main
[0.1.0-alpha.1]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.1

[0.1.0-alpha.2]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.2

[0.1.0-alpha.3]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.3

[0.1.0-alpha.4]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.4
