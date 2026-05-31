# Codex Light

Unofficial Win11 top-island status light for Codex CLI hooks and Codex Desktop fallback detection.

Codex Light places a compact, always-on-top island near the top of the Windows desktop and turns Codex activity into a visible status light.

## Status Mapping

| Codex event | State | Light |
| --- | --- | --- |
| `SessionStart` | idle | red |
| `UserPromptSubmit` | running | green |
| `PreToolUse` | running | green |
| `PermissionRequest` | waiting | yellow |
| `PostToolUse` | running | green |
| `Stop` | completed | red |
| `HookError` | error | red |

The Codex CLI path is hook-based and precise. Codex Desktop fallback is process-based and can only indicate that a matching desktop process is present.

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
