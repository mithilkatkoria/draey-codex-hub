param([string]$BuildDirectory = 'src-tauri/target/x86_64-pc-windows-msvc/release')
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repo
try {
    $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
    $source = Join-Path $BuildDirectory 'draey-codex-hub.exe'
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Build the release executable first with pnpm package.' }
    $output = Join-Path $repo "artifacts/releases/$version"
    if (Test-Path -LiteralPath $output) { throw "Output already exists: $output. Published versions must never be overwritten." }
    $portable = Join-Path $output 'portable'
    New-Item -ItemType Directory -Path $portable | Out-Null
    Copy-Item -LiteralPath $source -Destination (Join-Path $output 'Draey-Codex-Hub.exe')
    Copy-Item -LiteralPath $source -Destination (Join-Path $portable 'Draey Codex Hub.exe')
    foreach ($file in @('LICENSE', 'BRANDING.md')) { Copy-Item -LiteralPath $file -Destination $portable }
    @"
Draey Codex Hub $version - Windows x64 (also runs on ARM Windows through emulation)

Extract this folder, then open Draey Codex Hub.exe.
Install Codex Desktop and Codex CLI separately. Open Codex normally once, then
add and connect your own accounts in the Hub. No personal data is bundled.

Switching: sign out inside Codex, then choose a saved account in the Hub.
The Hub requests a normal restart and retains your existing Codex workspace.
If Codex remains in the background, use File > Quit (Ctrl+Q). The selected
account stays queued for up to ten minutes and continues after Codex exits.
Real A/B/A Desktop acceptance is still pending; this is an unsigned alpha.

Streamer mode: use the bottom-left Auto / On / Off control to mask private
details in the Hub. Auto detects supported apps running, not actual recording.
Choose On before sharing. Codex and browser login windows are not masked.

Microsoft Edge WebView2 is required. See setup and verification details:
https://github.com/mithilkatkoria/draey-codex-hub

Copyright 2026 Mithil Katkoria. MIT licensed. Independent community project.
"@ | Set-Content -LiteralPath (Join-Path $portable 'START-HERE.txt') -Encoding utf8
    Compress-Archive -Path (Join-Path $portable '*') -DestinationPath (Join-Path $output 'Draey-Codex-Hub-Windows.zip')
    $installers = @(Get-ChildItem -LiteralPath (Join-Path $BuildDirectory 'bundle/nsis') -Filter '*-setup.exe' -ErrorAction SilentlyContinue)
    if ($installers.Count -eq 1) { Copy-Item -LiteralPath $installers[0].FullName -Destination (Join-Path $output 'Draey-Codex-Hub-setup.exe') }
    elseif ($installers.Count -gt 1) { throw 'Multiple installers found. Use a clean version-specific build directory.' }
    $files = Get-ChildItem -LiteralPath $output -File | Sort-Object Name
    $files | ForEach-Object { '{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.Name } | Set-Content -LiteralPath (Join-Path $output 'SHA256SUMS.txt') -Encoding ascii
    Write-Output "Prepared $output"
} finally { Pop-Location }
