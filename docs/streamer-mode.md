# Streamer mode

Development feature, not yet included in a published release.

Use **Streamer mode** at the bottom left of the Hub, then choose:

- **Auto** (default): hide private details when a supported capture application is running. Detection checks approximately every five seconds. Details also stay hidden while the first check is pending or detection is unavailable.
- **On**: always hide private details, regardless of detection. Choose this before sharing your screen for continuous protection.
- **Off**: show details even when a recording app is detected.

The preference is saved locally for the next Hub launch. Detection inspects process names locally and returns only recognized application labels. It does not read recordings, capture the screen, collect process command lines or send detection information to a server.

Supported process names cover OBS Studio, Streamlabs Desktop, XSplit Broadcaster, Bandicam, Camtasia Recorder, ShareX, Loom, Snipping Tool, NVIDIA capture overlays and Xbox Game Bar. A running application does not prove that streaming or recording is active. Some utilities stay in the background, so Auto can remain on while they are idle. Browser-based sharing, conferencing apps and unrecognized recorders are not reliably detectable. Detection can also lag behind a recording starting; use On to avoid that gap.

When protected, the Hub replaces account and project names with numbered aliases, hides complete email addresses and folder paths, and withholds diagnostic and error details. Tooltips, accessibility labels, open editors and command results are covered. The tray keeps account aliases in both Auto and On, even without a detected recorder, so protection there does not depend on the Hub window staying visible. Off restores tray names. Limits, plans, reservations and launch targets are unchanged. Private editor fields and file-dialog actions are disabled until protection is off. Account sign-in and project launching remain available.

This is presentation privacy, not encryption or protection against someone accessing your computer. Stored accounts and paths are not modified. It applies to the Hub only. Codex, browser sign-in, external applications, existing file dialogs and exported files are outside its protection.

Verification: automated tests exercise detection decisions, manual overrides, preference persistence, recorder-start/stop transitions, full email/path masking, open forms, diagnostics and unchanged project launch IDs. Native recognition tests check supported executable names and reject browser names and substring matches. Actual recording-state detection is intentionally not claimed.
