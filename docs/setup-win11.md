# Codex Light Win11 Setup

## Script Install

From Windows PowerShell in this repository:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1
```

The installer:

- builds the unpacked Windows app unless `-SkipBuild` is passed,
- installs the app under `%LOCALAPPDATA%\Programs\CodexLight`,
- creates Desktop and Start Menu shortcuts,
- creates `%LOCALAPPDATA%\CodexLight`,
- launches `Codex Light.exe` unless `-NoLaunch` is passed.

Useful switches:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -SkipBuild
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -StartOnLogin
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -NoLaunch
```

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1
```

Runtime files are preserved by default. Remove them too with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1 -RemoveRuntime
```

## Development

```bash
npm install
npm run dev:electron
```

`npm run dev` starts only the renderer for visual iteration. `npm run dev:electron` builds the Electron main/preload bundles, starts the renderer dev server, and launches Electron.

## Hook Installation

```bash
npm run build
node dist/hook-cli/index.js install-hooks
node dist/hook-cli/index.js doctor
```

The hook command reads one Codex hook JSON payload from stdin and updates the local Codex Light state files.

For Codex CLI running inside Ubuntu 22 on WSL, use [setup-wsl-ubuntu22-codex-cli.md](setup-wsl-ubuntu22-codex-cli.md). The WSL hook must write to the Windows runtime directory, for example `/mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight`.

## Runtime Files

Codex Light stores runtime state under `%LOCALAPPDATA%/CodexLight` on Windows.

- `events.jsonl`: hook event history
- `state.json`: current island snapshot

For tests and non-Windows development, set `CODEX_LIGHT_HOME` to redirect runtime state to a temp directory.

## Manual Hook Snippet

If you prefer to edit Codex hooks manually, point lifecycle hooks at:

```powershell
codex-light hook
```

Codex Light's installer writes JSON hooks with `commandWindows` so Win11 can call the same hook command.

## Diagnostics

```bash
node dist/hook-cli/index.js doctor
```

The doctor command reports the runtime directory, state file path, hook config path, and whether the runtime directory is writable.

## Packaging

From Linux or WSL, use the unsigned unpacked Windows directory build:

```bash
npm run package:win:dir
```

The full NSIS installer command is:

```bash
npm run package:win
```

When run from Linux or WSL, the full installer may require `wine` because electron-builder needs Windows executable tooling. Prefer running the full installer build on Win11 CI or a Windows machine.
