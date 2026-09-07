# Changelog

All published releases receive an immutable Git tag and an entry here. Unreleased work is not a claim that the downloadable binary includes it.

## [Unreleased]

### Pending
- Record the next changes here.

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

[Unreleased]: https://github.com/mithilkatkoria/draey-codex-hub/compare/v0.1.0-alpha.2...main
[0.1.0-alpha.1]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.1

[0.1.0-alpha.2]: https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.2
