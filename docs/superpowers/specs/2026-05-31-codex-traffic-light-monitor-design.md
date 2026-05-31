---
astrolabe_change: codex-traffic-light-monitor
role: technical-design
canonical_spec: openspec
archived-with: 2026-05-31-codex-traffic-light-monitor
status: final
---

# Codex Traffic Light Monitor Technical Design

## Summary

Codex Light is a Win11-first Electron + React + TypeScript application that displays Codex CLI and Codex desktop status in a top-center expandable island. The CLI path is hook-precise. Desktop status uses the same hook/status path when available and otherwise degrades to process and recent-activity signals.

OpenSpec remains the source of truth for product requirements:

- `openspec/changes/codex-traffic-light-monitor/proposal.md`
- `openspec/changes/codex-traffic-light-monitor/design.md`
- `openspec/changes/codex-traffic-light-monitor/specs/*/spec.md`
- `openspec/changes/codex-traffic-light-monitor/tasks.md`

## Architecture

The implementation should use a small monorepo-style structure:

- `src/core`: framework-independent status types, hook parsing, state normalization, aggregation, runtime paths, and atomic file persistence.
- `src/hook-cli`: command invoked by Codex hooks. It reads one JSON object from stdin, validates it, and writes an event plus snapshot.
- `src/main`: Electron main process. It owns the overlay window, tray menu, file watching, desktop fallback detector, and IPC.
- `src/renderer`: React island UI. It receives normalized state and renders compact/expanded views.
- `tests`: fixtures, unit tests, integration tests, and visual checks.
- `docs`: setup, hook snippets, and troubleshooting.

Keep `core` free of Electron and React imports. This keeps the status model testable in plain Node and makes hook ingestion deterministic.

## Data Flow

```text
Codex lifecycle hook
  -> codex-light hook
  -> %LOCALAPPDATA%/CodexLight/events.jsonl
  -> %LOCALAPPDATA%/CodexLight/state.json
  -> Electron main file watcher
  -> normalize and aggregate state
  -> IPC to React renderer
  -> top island UI
```

Desktop fallback adds a second signal path:

```text
Electron main process detector
  -> desktop fallback event
  -> core aggregation
  -> renderer details marked as fallback
```

The runtime directory is `%LOCALAPPDATA%/CodexLight` on Windows. Tests and non-Windows development use an explicit override environment variable, for example `CODEX_LIGHT_HOME`, so CI can run without mutating a user's home directory.

## Status Model

The normalized model should be explicit and stable:

```ts
type CodexLightState = 'idle' | 'running' | 'waiting' | 'completed' | 'error';
type CodexLightSource = 'cli' | 'desktop' | 'desktop-fallback';

interface CodexSession {
  sessionId: string;
  source: CodexLightSource;
  state: CodexLightState;
  cwd?: string;
  projectName?: string;
  model?: string;
  action?: string;
  startedAt: string;
  updatedAt: string;
  turnId?: string;
  fallbackReason?: string;
}

interface CodexLightSnapshot {
  version: 1;
  generatedAt: string;
  globalState: CodexLightState;
  activeSessionCount: number;
  sessions: CodexSession[];
  diagnostics: DiagnosticEvent[];
}
```

Priority order for global display is:

1. `waiting`
2. `running`
3. `error`
4. `completed`
5. `idle`

`PermissionRequest` maps to `waiting`. `SessionStart`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse` map to `running` unless a newer waiting signal exists for the same active turn. `Stop` maps to `completed`. Invalid hook input produces diagnostics and must not corrupt the last valid snapshot.

## Storage

Use two files:

- `events.jsonl`: append-only audit trail for hook and fallback events.
- `state.json`: compact current snapshot consumed by Electron.

Write snapshots with atomic temp-file replacement:

1. Write `state.json.tmp`.
2. Flush and close the file.
3. Rename it to `state.json`.

The hook CLI should be short-lived and safe to run concurrently. If concurrent writes are observed in tests, add a small lock file or retry loop around append and snapshot replacement.

## Hook Integration

Codex command hooks receive JSON on stdin. `install-hooks` should add handlers for the events needed by the status model, using Windows command syntax where Codex supports `commandWindows`.

The hook command should not emit noisy stdout. On success it exits `0`. On malformed input or write failure it records a diagnostic when possible and exits non-zero.

`install-hooks` must be idempotent:

- detect an existing Codex Light block,
- write one backup before modifying config,
- preserve unrelated user hooks,
- avoid duplicate handlers on repeated runs.

`doctor` must report the Codex config path, hook executable path, runtime directory, current snapshot health, and desktop fallback status.

## Electron Window Strategy

Use one `BrowserWindow` for the island overlay:

- `frame: false`
- `transparent: true`
- `resizable: false`
- topmost behavior enabled
- skip taskbar for the overlay window
- fixed compact and expanded dimensions managed by Electron main

The window should be sized close to the actual island bounds instead of spanning the full display. That reduces the risk of transparent regions blocking clicks. If a larger transparent region is needed for animation, implement pointer handling carefully and verify on Win11.

Position against the primary display work area, horizontally centered, with a small top offset. Keep fullscreen apps and taskbar behavior as a known limitation unless Windows testing proves a reliable overlay policy.

## Renderer UI

The renderer implements two states:

- Compact: status light, short label, active session count.
- Expanded: source, project/cwd, model, action, elapsed time, all active sessions, and fallback indicators.

Interaction:

- Hover expands.
- Click toggles pinned expanded mode.
- Escape collapses pinned mode.
- Tray menu can hide or show the overlay.

Visual language:

- Green: running
- Yellow: waiting
- Red: completed or error
- Neutral: idle

Use restrained motion: spring-like width/height transition, status light pulse for active work, stronger pulse for waiting. Avoid large decorative backgrounds; the product should feel like a precise system overlay.

## Desktop Fallback

Desktop support must be honest about precision. The main process should first consume desktop-origin hook events if they appear. If not, it may detect process presence and recent activity, then emit `desktop-fallback` sessions with a visible `fallbackReason`.

The implementation should keep process names configurable because the exact Codex desktop process name may vary by version.

## Testing Strategy

Core tests:

- hook payload parsing for supported events,
- malformed JSON behavior,
- state priority,
- multi-session aggregation,
- desktop fallback sessions.

CLI integration tests:

- stdin fixture writes event log and snapshot,
- repeated events update existing sessions,
- malformed input exits non-zero without corrupting snapshot.

Installer tests:

- first install adds one hook block,
- repeated install is idempotent,
- unrelated hooks are preserved,
- missing executable path is reported by doctor.

UI and Electron tests:

- compact island renders nonblank,
- expanded island renders details,
- green, yellow, and red states are visually distinct,
- top-center positioning is correct in a controlled viewport,
- transparent or unused window area does not block expected clicks where the platform permits verification.

## Risks

- Codex hook schemas may change. Keep parser logic centralized and add fixtures for each supported event.
- Desktop hooks may not work in the target app. Show `desktop-fallback` instead of presenting false precision.
- Electron transparent windows have platform limitations. Avoid resizable transparent windows and verify Win11 behavior early.
- Hook config editing can break user workflows. Use backups, idempotent markers, dry-run output, and `doctor`.
- This repository is not currently a git repository. Astrolabe commit steps cannot be completed until git is initialized or the project is moved into a git workspace.

## Verification Commands

Initial implementation should make these commands valid:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:visual
```

Until implementation exists, OpenSpec and Astrolabe verification are the only runnable checks.
