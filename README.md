# Draey Codex Hub

An open-source Windows companion for viewing real Codex account allowances and opening accounts in your existing Codex workspace. Built in public with Tauri, Rust, React, and TypeScript.

**Early test build:** full real A/B/A account-switch acceptance is still pending. This is an independent community project, not an official OpenAI product.

## Download for Windows

**[Download v0.1.0-alpha.1](https://github.com/mithilkatkoria/draey-codex-hub/releases/tag/v0.1.0-alpha.1)**

1. Download `Draey-Codex-Hub-Windows.zip` from the release's **Assets** section. GitHub's automatic **Source code** downloads do not contain the app.
2. Extract the ZIP and double-click **Draey Codex Hub.exe**. A standalone `.exe` is also attached to the release.
3. Install [Codex Desktop](https://developers.openai.com/codex/app/) and [Codex CLI](https://developers.openai.com/codex/cli/) separately; open Codex normally once.
4. Add your own accounts in the Hub and complete OpenAI sign-in for each. If detection fails, choose the Desktop and CLI executables in Settings.

The download is an unsigned x64 Windows test build, also tested on Windows ARM through x64 emulation. It needs [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/). If Windows reports a missing Visual C++ runtime DLL, install the [Microsoft x64 Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe). Node.js and Rust are not required to run the download. An installer and signed releases are future work.

## What it does

- Automatically requests real allowances independently for every saved account through Codex `account/rateLimits/read`.
- Displays the windows actually reported, including different Pro and additional-model layouts; missing values remain unknown.
- Preserves Friend Priority and Reserved preferences. Account selection is deliberate, with no automatic rotation or Pro prioritization.
- Offers project shortcuts, Ctrl+K commands, tray support, settings, and timestamped cached values.
- Uses the existing Codex workspace instead of opening an empty separate desktop profile.

## Account switching and local data

Choose an account in the Hub. If another account is selected while Codex is running, save your work and quit all Codex Desktop windows. Keep the Hub open; it waits for Desktop to exit before changing authentication and reopening the existing workspace. You can cancel while waiting.

Projects, tasks, desktop data, and configuration stay in place. The Hub transfers only local `auth.json` credentials, retains a recovery backup, and serializes switching against its own authentication operations. Finish independent CLI work before switching too. File-based credentials are currently required; other credential-store configurations are preserved and rejected for switching.

Account slots, settings, and sensitive authentication backups are created under `%LOCALAPPDATA%\dev.draey.codexhub`. The shared workspace is `%USERPROFILE%\.codex`. **Never upload either location, credentials, or authentication backups to GitHub.** Release packages contain no personal accounts or projects. Each user signs into their own accounts.

## Build from source

Prerequisites: Windows, Git, Node.js 22+, pnpm 10, [Rust via rustup](https://rustup.rs/), and [Tauri's Windows prerequisites](https://v2.tauri.app/start/prerequisites/) (Visual Studio C++ Build Tools, Windows SDK, WebView2). The repository selects the x64 MSVC Rust toolchain, including on ARM Windows; install the x64 C++ libraries. Ensure Cargo is on PATH.

```powershell
git clone https://github.com/mithilkatkoria/draey-codex-hub.git
cd draey-codex-hub
npm install --global pnpm@10
pnpm install --frozen-lockfile
pnpm desktop
```

Build a standalone embedded-UI test executable:

```powershell
pnpm tauri build --debug --no-bundle
# src-tauri/target/debug/draey-codex-hub.exe
```

Build a release executable and NSIS installer locally:

```powershell
pnpm package
# src-tauri/target/release/bundle/nsis/
```

The downloadable alpha was built from the earlier locally tested snapshot before repository documentation was added; it is not represented as a reproducible build of the repository tag. Its checksum is supplied with the release. Future source builds use the commands above.

## Tests and project layout

```powershell
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

`src/` contains the dashboard and native bridge. `src-tauri/src/` contains persistence, usage parsing, Codex RPC, and workspace authentication handoff. `scripts/` and the Rust example contain local diagnostic probes; do not publish their output without reviewing it. `VERIFICATION.md` records tested behavior and remaining acceptance checks.

The repository's Windows CI runs frontend tests/build and Rust tests on pushes and pull requests. It does not sign into real accounts or certify account switching.

## Development workflow

`main` is the default development branch. Maintainers can push directly, or use a feature branch and pull request:

```powershell
git switch -c feature/my-change
# edit and run tests
git add .
git commit -m "Describe the change"
git push -u origin feature/my-change
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions are welcome under the [MIT license](LICENSE).
