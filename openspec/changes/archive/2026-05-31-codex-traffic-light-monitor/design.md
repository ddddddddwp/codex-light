## Context

The project starts from an almost empty repository. The target product is a Win11 monitor for Codex CLI and the Codex desktop app, inspired by the state-file plus hook approach used by `claude-code-traffic-light`, but with a stronger desktop UI: a top-of-screen, expandable "dynamic island" overlay.

The user selected the expandable island direction and approved Electron + React + TypeScript as the primary stack. Resource usage is not a priority; UI expression, animation quality, engineering ergonomics, and testability are. Current Codex documentation exposes lifecycle hooks through `hooks.json` or inline config and command hooks receive JSON on stdin. Electron documentation supports frameless and transparent windows through `BrowserWindow` options, with known transparent-window limitations that the design accounts for.

Primary references:

- OpenAI Codex Hooks: https://developers.openai.com/codex/hooks
- OpenAI Codex Config Reference: https://developers.openai.com/codex/config-reference
- Electron Custom Window Styles: https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- Electron BrowserWindow API: https://www.electronjs.org/docs/latest/api/browser-window

## Goals / Non-Goals

**Goals:**

- Build a Win11-first Electron app with a top-center transparent overlay that looks and behaves like an expandable dynamic island.
- Capture Codex CLI state precisely from lifecycle hooks where available.
- Attempt to capture Codex desktop app state through the same hook/status path, then degrade to process presence and recent activity when hooks are unavailable.
- Keep the state model independent from Electron and React so it can be tested without a desktop shell.
- Provide `install-hooks` and `doctor` commands so users can wire and verify Codex integration without editing config by hand.
- Provide focused unit, integration, and visual tests.

**Non-Goals:**

- Do not modify Codex internals or depend on private Codex APIs.
- Do not build a macOS or Linux product in the first implementation.
- Do not estimate token counts or inspect private transcript content beyond hook metadata needed for status display.
- Do not implement Tauri as a parallel runtime in the first implementation.

## Decisions

### Use Electron + React + TypeScript as the product shell

Electron is the primary runtime because the product depends on polished UI, a transparent frameless overlay, topmost behavior, tray integration, and fast renderer iteration. React handles the island UI, animation states, and expanded details. TypeScript gives the shared state model and hook payload handling a typed contract.

Alternatives considered:

- Tauri v2: strong native and lightweight story, but its main advantage is resource efficiency, which is not the user's priority.
- Python, AutoHotkey, or PowerShell: useful for spikes but weak for a polished always-on-top UI and maintainable app packaging.

### Use a shared core package for status normalization

All hook payloads and fallback signals flow through a framework-independent core module. The core module maps raw events into normalized sessions and display states:

- `running`: green, Codex is actively working.
- `waiting`: yellow, Codex is waiting for permission or user input.
- `completed`: red, a turn/session has completed and needs attention.
- `error`: red, a hook or runtime failure occurred.
- `idle`: neutral, no recent active session.

The renderer consumes the normalized state rather than raw hook payloads.

### Use a local JSON state file as the integration boundary

The hook command writes append-only event records and a compact current-state snapshot under `%LOCALAPPDATA%/CodexLight/`. The Electron main process watches the snapshot and event log, forwards normalized state to the renderer, and tolerates partial writes by using atomic temp-file rename.

This mirrors the reference project's durable state-file pattern while keeping the UI process decoupled from Codex process lifetimes.

### Treat Codex desktop support as progressive enhancement

The CLI path is expected to be exact because lifecycle hooks are under user configuration. Desktop support first attempts the same hooks. If the desktop app does not emit or honor hooks in the user's environment, the app displays a degraded desktop source:

- process present or absent,
- last observed state-file activity,
- last known event source,
- a visible "fallback" indicator in expanded details.

This avoids claiming precision where the desktop app does not provide a reliable signal.

### Keep the overlay non-intrusive by default

The app creates a small top-center transparent window. The island is interactive; transparent regions should not block normal desktop use. The default island shows status light, short label, and optional count. Hover or click expands to show source, project/cwd, model, current action, elapsed time, and number of active sessions.

Electron transparent windows have platform limitations, so the implementation will avoid resizable transparent overlay behavior and will verify click-through and focus behavior on Windows.

## Risks / Trade-offs

- Codex hook event names or schemas may change -> isolate event parsing in one module and include fixtures for supported schemas.
- Desktop app hooks may not fire consistently -> show explicit degraded status using process and recency signals.
- Transparent topmost windows can accidentally intercept clicks -> keep the BrowserWindow sized close to the island, use pointer behavior carefully, and test click-through on transparent regions.
- Multiple Codex sessions can produce competing states -> aggregate by session id, prioritize waiting over running, and show count in the collapsed island.
- Hook installation can corrupt user config if done carelessly -> implement backup, idempotent insertion, and a dry-run/doctor path.

## Migration Plan

1. Scaffold the Electron monorepo and shared packages.
2. Implement the core status model and hook CLI with fixture-driven tests.
3. Implement the Electron main window, file watcher, tray, and renderer IPC.
4. Implement the top island UI and visual states.
5. Add hook installation and diagnostics.
6. Add desktop fallback detection.
7. Run automated tests and Playwright/Electron screenshot checks.

Rollback is local: remove the generated Codex hook config block, quit the app, and delete `%LOCALAPPDATA%/CodexLight/` runtime state if needed.

## Open Questions

- Which exact process names identify the current Codex Windows desktop app in the user's installed environment?
- Which hook events are emitted by the desktop app, if any, on the target Win11 machine?
- Should completed state remain red indefinitely or fade to idle after a configurable timeout? The first implementation will keep completed visible until superseded by a new event, with a later setting if needed.
