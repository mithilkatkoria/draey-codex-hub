# Changelog

All published releases receive an immutable Git tag and an entry here. Unreleased work is not a claim that the downloadable binary includes it.

## [Unreleased]

### Pending
- Record the next changes here.

## [0.1.0-alpha.2] - 2026-09-06

### Fixed
- Detect Codex sign-out while an account switch is waiting and request a normal restart of the default Desktop window before loading the saved login.
- Preserve refreshed credentials in the matching saved account slot before logout removes the workspace login.
- Avoid waiting for unrelated isolated Desktop instances; reject unreadable process state instead of assuming Codex is closed.
- Keep Node release-tool tests separate from Vitest dashboard tests.

The signed-out restart flow still requires real Desktop acceptance; no production-readiness claim is made.

### Added
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
