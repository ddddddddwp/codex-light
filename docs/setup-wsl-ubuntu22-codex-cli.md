# Ubuntu 22 / WSL Codex CLI Integration

Use this when Codex CLI runs inside Ubuntu 22 on WSL and Codex Light runs on Win11.

## Script Install

From this repository inside WSL:

```bash
bash scripts/install-wsl-hooks.sh
```

The script:

- detects the Windows username with `powershell.exe`,
- creates `/mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight`,
- builds `dist/hook-cli/index.js` unless `--no-build` is passed,
- installs Codex CLI hooks into `~/.codex/hooks.json`,
- runs `doctor`,
- writes a manual `UserPromptSubmit` test event unless `--no-test-event` is passed.

Useful switches:

```bash
bash scripts/install-wsl-hooks.sh --windows-user <WindowsUser>
bash scripts/install-wsl-hooks.sh --runtime-dir /mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight
bash scripts/install-wsl-hooks.sh --no-build
bash scripts/install-wsl-hooks.sh --no-test-event
```

The manual steps below are equivalent to what the script does.

## 1. Build Codex Light

From this repository:

```bash
npm install
npm run build
```

## 2. Find The Windows Runtime Directory From WSL

Replace `<WindowsUser>` with your Windows user name:

```bash
export CODEX_LIGHT_HOME="/mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight"
mkdir -p "$CODEX_LIGHT_HOME"
```

This is the same runtime directory the Win11 Electron app reads as `%LOCALAPPDATA%\CodexLight`.

## 3. Install Codex CLI Hooks In Ubuntu

Use an absolute path to the built hook CLI:

```bash
HOOK_CLI="$(pwd)/dist/hook-cli/index.js"
node "$HOOK_CLI" install-hooks \
  --hook-command "CODEX_LIGHT_HOME=\"$CODEX_LIGHT_HOME\" node \"$HOOK_CLI\" hook"
```

This writes hooks to `~/.codex/hooks.json` inside Ubuntu. Codex CLI will send lifecycle hook JSON to Codex Light's hook command, and the hook command will write state into the Windows-readable runtime directory.

## 4. Verify Hook Health

```bash
CODEX_LIGHT_HOME="$CODEX_LIGHT_HOME" node "$HOOK_CLI" doctor \
  --hook-executable "$(command -v node)"
```

Expected checks:

- `runtimeWritable`: `true`
- `hooksExists`: `true`
- `hookExecutableExists`: `true`

## 5. Start The Win11 App

Run `Codex Light.exe` from the Win11 package. Start a Codex CLI session in Ubuntu 22 and trigger a prompt or approval request. The top island should switch to running or waiting state.

## Notes

- The full Codex Desktop state is best-effort. CLI hook status is the precise path.
- If Windows is installed somewhere other than `/mnt/c`, adjust `CODEX_LIGHT_HOME`.
- If Node is not available in Ubuntu, install Node 22 or use the same Node runtime used by Codex CLI.
