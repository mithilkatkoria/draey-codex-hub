# Windows publisher signing

This app currently has no verified Windows publisher certificate. The Tauri update signature protects update integrity, but does not establish a Windows publisher identity or remove SmartScreen warnings. A self-signed certificate would not solve this for your friend.

## What the owner needs to do

1. Choose a permanent publisher identity: your legal name or your registered business. The app's marketing name can be different.
2. Check eligibility for [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/overview). Create its Azure account/resource, complete the required identity verification, and create a **Public Trust** certificate profile. This may involve charges. Alternatively obtain a trusted code-signing certificate from a certificate authority.
3. Keep credentials private. For Azure, configure a GitHub Actions federated identity with only the signing role needed for that certificate profile. Do not put private keys, passwords, or cloud credentials in the repository or chat.
4. Supply the verified signing configuration to the release build. Sign both the application EXE and its NSIS installer using Tauri's Windows `signCommand` integration or your provider's supported SignTool integration. Sign during bundling, before Tauri creates the updater signature and SHA-256 checksums.
5. Verify both files with `Get-AuthenticodeSignature`. Require `Status` to be `Valid`, verify the expected publisher subject, and use a trusted timestamp. Do not publish partially signed output.
6. Test installation on a separate Windows machine, then publish a new version. Existing unsigned downloads cannot become signed in place. Never overwrite a published release.

The signing provider must verify the owner. An assistant cannot complete that identity verification on the owner's behalf. No signing subscription has been purchased or configured by this task.

Microsoft explicitly states that a new signed app can still receive SmartScreen warnings while reputation builds. Signing fixes the verified publisher identity; it does not guarantee an immediate warning-free download. Do not ask users to disable Defender or SmartScreen.

References: [Microsoft signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options), [SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation), [Tauri Windows signing](https://v2.tauri.app/distribute/sign/windows/).
