# Contributing

Fork the repository, create a branch from `main`, and open a pull request. Maintainers can push small validated changes directly to `main`; branches are recommended for larger changes.

Run `pnpm test`, `pnpm build`, and `cargo test --manifest-path src-tauri/Cargo.toml --lib`. Explain the resulting behavior and relevant validation in your pull request.

Preserve real-data-only production behavior, independent account refresh, dynamic plan windows, explicit account selection, and Friend Priority / Reserved preferences. Never silently rotate accounts or prioritize Pro. Keep auth handling local and credentials out of logs, diagnostics, screenshots, commits, and release archives.

Do not claim real account switching works without testing the actual identities and original workspace after a full A/B/A sequence. Record limitations honestly. Development mocks are opt-in and must never become a production fallback.

For releases, build and test on Windows, create a version tag, and attach only the executable/installer or clean ZIP plus checksums to a GitHub release. Mark incomplete acceptance builds as prereleases. Never attach profile directories, auth backups, build research, or user configuration.

Record user-visible changes under Unreleased in [CHANGELOG.md](CHANGELOG.md). Follow [RELEASING.md](RELEASING.md) for version bumps and release tags. Preserve the copyright/license notice and distinguish forks from official distributions; see [BRANDING.md](BRANDING.md).
