# Codex Light

[中文](README.md)

Unofficial Win11 top-island status light for Codex CLI hooks and Codex Desktop fallback detection.

Codex Light places a compact, always-on-top island near the top of the Windows desktop and turns Codex activity into a visible status light.

## Status Mapping

| Codex event | State | Light |
| --- | --- | --- |
| `SessionStart` | idle | red |
| `UserPromptSubmit` | running | green |
| `PreToolUse` | running | green |
| `PreToolUse` requiring approval | waiting | yellow |
| `PermissionRequest` | waiting | yellow |
| `PostToolUse` | running | green |
| `Stop` / `SessionEnd` / `SubagentStop` | completed | red |
| `HookError` | error | red |

The Codex CLI path is hook-based and precise. Codex Desktop fallback is process-based and can only indicate that a matching desktop process is present.
The hook installer currently registers `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, and `Stop`; the normalizer also understands `SessionEnd`, `SubagentStop`, and `HookError` if those events are received.

## Requirements

- Windows 11 for the desktop app.
- Node.js 22+ for development and hook CLI execution.
- Codex CLI configured in the environment where hooks are installed.
- For WSL usage, Windows must expose the runtime directory through `/mnt/c/...`.

## Build

```bash
npm install
npm run build
```

Create an unpacked Windows build:

```bash
npm run package:win:dir
```

The generated app is written to:

```text
dist/win-unpacked/Codex Light.exe
```

## Install On Win11

For normal desktop use, install with the generated setup executable:

```text
dist/Codex-Light-Setup-0.1.0.exe
```

The setup installer closes existing Codex Light processes before replacing files, creates Desktop and Start Menu shortcuts, and can launch Codex Light when installation finishes.
It also shows an optional startup (开机启动) checkbox. The option is unchecked on fresh installs, preserves an existing startup shortcut on upgrade, and removes the startup shortcut on uninstall.

Build the setup executable:

```bash
npm run package:win
```

If you are working from WSL/Linux and NSIS packaging needs Windows executable tooling, build the installer on Win11. For development installs, use the PowerShell script below.

## Release From GitHub Actions

Maintainers can publish a Windows installer from the manual GitHub Actions `Release` workflow.
Choose `patch`, `minor`, or `major`; the workflow validates the project, builds `npm run package:win` on `windows-latest`, commits the version bump, tags `vX.Y.Z`, and uploads `Codex-Light-Setup-X.Y.Z.exe` to a GitHub Release.

See [docs/release.md](docs/release.md) for the release checklist and installer behavior details.

## Developer Script Install On Win11

From Windows PowerShell in this repository:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1
```

Useful switches:

```powershell
# Reuse an existing dist\win-unpacked build.
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -SkipBuild

# Install and launch Codex Light automatically when Windows starts.
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -StartOnLogin

# Install without launching the app.
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -NoLaunch
```

The installer copies the app to:

```text
%LOCALAPPDATA%\Programs\CodexLight
```

It also creates Desktop and Start Menu shortcuts.

## Run On Win11

Start the packaged app:

```text
Codex Light.exe
```

Runtime state is stored under:

```text
%LOCALAPPDATA%\CodexLight
```

The key files are:

- `state.json` - current aggregated status.
- `events.jsonl` - append-only hook event log.

## Connect Codex CLI From WSL Ubuntu

From the project directory inside WSL:

```bash
bash scripts/install-wsl-hooks.sh
```

Useful switches:

```bash
bash scripts/install-wsl-hooks.sh --windows-user <WindowsUser>
bash scripts/install-wsl-hooks.sh --no-build
bash scripts/install-wsl-hooks.sh --no-test-event
```

Manual equivalent:

```bash
npm install
npm run build

export CODEX_LIGHT_HOME="/mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight"
mkdir -p "$CODEX_LIGHT_HOME"

HOOK_CLI="$(pwd)/dist/hook-cli/index.js"

node "$HOOK_CLI" install-hooks \
  --hook-command "CODEX_LIGHT_HOME=\"$CODEX_LIGHT_HOME\" node \"$HOOK_CLI\" hook"
```

Verify the connection:

```bash
CODEX_LIGHT_HOME="$CODEX_LIGHT_HOME" node "$HOOK_CLI" doctor \
  --hook-executable "$(command -v node)"
```

Expected important fields:

```json
{
  "runtimeWritable": true,
  "hooksExists": true,
  "hookExecutableExists": true
}
```

Manual event test:

```bash
printf '{"hook_event_name":"UserPromptSubmit","session_id":"test-1","cwd":"%s","model":"gpt-5.5"}' "$PWD" \
  | CODEX_LIGHT_HOME="$CODEX_LIGHT_HOME" node "$HOOK_CLI" hook
```

The Win11 island should switch to green/running.

## Uninstall From Win11

From Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1
```

Runtime state is preserved by default. To remove it too:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1 -RemoveRuntime
```

## CLI Commands

```bash
node dist/hook-cli/index.js hook
node dist/hook-cli/index.js install-hooks
node dist/hook-cli/index.js doctor
```

## Development

```bash
npm run lint
npm run typecheck
npm test
npm run test:visual
```

Run Electron in development mode:

```bash
npm run dev:electron
```

## Notes

- This project is not affiliated with or endorsed by OpenAI.
- The Windows desktop app uses file watching plus polling so status updates remain reliable when hooks write from WSL into the Windows filesystem.
- Packaged renderer assets use relative paths so the app works correctly from `file://.../app.asar/...`.

## License

MIT. See [LICENSE](LICENSE).
