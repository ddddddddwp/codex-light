# Astrolabe Design Handoff

- Change: codex-traffic-light-monitor
- Phase: design
- Mode: compact
- Context hash: 65d1194543571a0c8b4f91a9623993f8ada9b7e7ff6f797ed97af8c3fd00bd44

Generated-by: ast-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/codex-traffic-light-monitor/proposal.md

- Source: openspec/changes/codex-traffic-light-monitor/proposal.md
- Lines: 1-33
- SHA256: f8df813c5d042ae34e29dd8b0a177c2cdc101de79260fcc979546fde984d13b6

```md
## Why

Codex CLI and the Windows desktop app can run long tasks, pause for approvals, or finish while the user is focused elsewhere. A Win11 top-of-screen "dynamic island" monitor gives immediate status visibility without requiring the user to keep the terminal or desktop app in front.

## What Changes

- Add a Windows-first Electron + React application named Codex Light.
- Add a topmost, frameless, transparent, expandable island overlay at the top center of the primary display.
- Add a local status model that aggregates Codex hook events into clear states: running, waiting for approval, completed, error, and idle.
- Add a hook command that Codex lifecycle hooks can call on Windows to update the local status file.
- Add desktop app fallback monitoring: first use the same hook/status path when available, otherwise show process presence and recent activity.
- Add installation and diagnostics commands for Codex hook setup, state-file permissions, and runtime health.
- Add tests and visual verification for the state model, hook ingestion, and island UI states.

## Capabilities

### New Capabilities

- `codex-status-ingestion`: Capture Codex CLI and desktop status through hooks, local state files, and desktop fallback signals.
- `top-island-overlay`: Present Codex status in a Win11 top-center expandable island with clear visual states.
- `win11-app-operations`: Provide Windows installation, hook setup, diagnostics, tray behavior, and developer verification workflows.

### Modified Capabilities

- None.

## Impact

- Introduces a new Electron + React + TypeScript codebase in this repository.
- Adds Node-based CLI entry points for hook ingestion, installation, and diagnostics.
- Writes runtime state under `%LOCALAPPDATA%/CodexLight/` on Windows, with development fallbacks for non-Windows test environments.
- Reads and updates Codex hook configuration under the user's Codex config directory when the user runs hook installation.
- Uses current Codex lifecycle hooks as documented by OpenAI and Electron transparent/frameless window APIs as documented by Electron.
```

## openspec/changes/codex-traffic-light-monitor/design.md

- Source: openspec/changes/codex-traffic-light-monitor/design.md
- Lines: 1-102
- SHA256: 003d4839da9a82cea1c7c446464b94dfe922c424cba4d06afbfeee8599287b00

[TRUNCATED]

```md
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
```

Full source: openspec/changes/codex-traffic-light-monitor/design.md

## openspec/changes/codex-traffic-light-monitor/tasks.md

- Source: openspec/changes/codex-traffic-light-monitor/tasks.md
- Lines: 1-52
- SHA256: 5bfb698defebe98af381be2877c1120e29ab1b41d0267b2c16e4626a67fb153c

```md
## 1. Project Foundation

- [ ] 1.1 Initialize an Electron + React + TypeScript workspace with package scripts for dev, build, test, lint, and typecheck
- [ ] 1.2 Add shared directory structure for Electron main, renderer, hook CLI, core state logic, assets, tests, and documentation
- [ ] 1.3 Configure formatting, linting, TypeScript project references, and test runner
- [ ] 1.4 Add Windows runtime path helpers with non-Windows development fallbacks

## 2. Core Status Model

- [ ] 2.1 Define normalized Codex event, session, source, and display-state types
- [ ] 2.2 Implement hook payload parsing and validation
- [ ] 2.3 Implement event-to-session normalization for running, waiting, completed, error, and idle states
- [ ] 2.4 Implement multi-session aggregation with waiting priority and active session counts
- [ ] 2.5 Add fixture-based unit tests for supported hook events and fallback events

## 3. Hook CLI And State Storage

- [ ] 3.1 Implement the hook command that reads one JSON payload from stdin
- [ ] 3.2 Implement append-only event log writing and atomic snapshot updates
- [ ] 3.3 Implement error diagnostics for malformed input and write failures
- [ ] 3.4 Add command-line fixtures or scripts to simulate hook events during development
- [ ] 3.5 Add integration tests for CLI input, state file output, and malformed payload behavior

## 4. Electron Main Process

- [ ] 4.1 Create the transparent frameless topmost BrowserWindow for the island overlay
- [ ] 4.2 Implement primary-display positioning and compact/expanded window sizing
- [ ] 4.3 Watch the status snapshot and forward normalized state to the renderer through IPC
- [ ] 4.4 Add tray menu controls for show, hide, diagnostics, reload, and quit
- [ ] 4.5 Add desktop fallback process/recent-activity detection

## 5. Renderer UI

- [ ] 5.1 Build the compact top island with status light, label, and session count
- [ ] 5.2 Build expanded island details with source, project/cwd, model, action, elapsed time, and fallback indicators
- [ ] 5.3 Add polished transitions for compact-to-expanded state changes
- [ ] 5.4 Add state-specific visuals for running, waiting, completed, error, and idle
- [ ] 5.5 Verify transparent-area click behavior and adjust window sizing or pointer handling

## 6. Installation And Diagnostics

- [ ] 6.1 Implement `install-hooks` with backup, idempotent update, and Windows command support
- [ ] 6.2 Implement `doctor` checks for Codex config, hook executable path, runtime directory, state file, and desktop fallback status
- [ ] 6.3 Document manual hook config snippets for users who do not want automatic edits
- [ ] 6.4 Add tests for idempotent hook installation against temp config files

## 7. Verification And Packaging

- [ ] 7.1 Add Playwright or Electron-based screenshot checks for compact and expanded island states
- [ ] 7.2 Run unit, integration, lint, typecheck, and build verification
- [ ] 7.3 Add a development README with Win11 setup, Codex hook setup, and troubleshooting
- [ ] 7.4 Configure Windows packaging metadata and verify the app can be launched locally
```

## openspec/changes/codex-traffic-light-monitor/specs/codex-status-ingestion/spec.md

- Source: openspec/changes/codex-traffic-light-monitor/specs/codex-status-ingestion/spec.md
- Lines: 1-62
- SHA256: 671d2356ba952a422addd1c809af45c9dc03acb39271993ca61ccc19657daa54

```md
## ADDED Requirements

### Requirement: Hook command records Codex lifecycle events

The system SHALL provide a hook command that accepts one Codex hook JSON object on stdin and records it under the local Codex Light runtime directory.

#### Scenario: Record valid hook input

- **WHEN** the hook command receives a valid Codex hook payload containing `hook_event_name`, `session_id`, `cwd`, and `model`
- **THEN** the system writes an event record and updates the current status snapshot atomically

#### Scenario: Reject malformed hook input

- **WHEN** the hook command receives invalid JSON or a payload without a hook event name
- **THEN** the system exits non-zero and records a diagnostic error without corrupting the current status snapshot

### Requirement: Normalize hook events into display states

The system SHALL map Codex hook and fallback events into normalized session states suitable for UI display.

#### Scenario: Permission request becomes waiting

- **WHEN** a `PermissionRequest` hook event is recorded for a session
- **THEN** the normalized session state becomes `waiting`

#### Scenario: Tool or prompt activity becomes running

- **WHEN** a `SessionStart`, `UserPromptSubmit`, `PreToolUse`, or `PostToolUse` hook event is recorded for a session
- **THEN** the normalized session state becomes `running` unless a newer waiting event exists for the same active turn

#### Scenario: Stop becomes completed

- **WHEN** a `Stop` hook event is recorded for a session
- **THEN** the normalized session state becomes `completed`

### Requirement: Aggregate multiple Codex sessions

The system SHALL aggregate multiple sessions into one global display state for the island.

#### Scenario: Waiting has highest visible priority

- **WHEN** at least one active session is waiting and another active session is running
- **THEN** the global display state is `waiting` and the expanded details list both sessions

#### Scenario: Active sessions include a count

- **WHEN** more than one non-idle session exists
- **THEN** the compact island displays the number of sessions

### Requirement: Desktop fallback reports degraded status

The system SHALL report Codex desktop app status as degraded when hook-based desktop events are unavailable.

#### Scenario: Desktop process is present without hook activity

- **WHEN** the desktop process detector finds a Codex desktop process and no recent desktop hook event exists
- **THEN** the system records a desktop fallback status with source `desktop-fallback`

#### Scenario: Desktop fallback is visible in details

- **WHEN** the renderer displays an expanded desktop fallback session
- **THEN** the details identify the status as process or recent-activity based rather than hook-precise
```

## openspec/changes/codex-traffic-light-monitor/specs/top-island-overlay/spec.md

- Source: openspec/changes/codex-traffic-light-monitor/specs/top-island-overlay/spec.md
- Lines: 1-57
- SHA256: 883dbc20267a43dfb2cb0d826a225bc395ef1ae4a69c11aeac5ce961f089bd5a

```md
## ADDED Requirements

### Requirement: Top island appears at the top center of the primary display

The system SHALL render a frameless, transparent, topmost overlay window containing a compact island at the top center of the primary Win11 display.

#### Scenario: App starts with compact island

- **WHEN** the desktop app launches
- **THEN** a compact island appears near the top center of the primary display without a native title bar

#### Scenario: Overlay remains above normal windows

- **WHEN** a normal application window receives focus
- **THEN** the island remains visible above that normal window

### Requirement: Island uses clear status colors and labels

The system SHALL show distinct visual states for running, waiting, completed, error, and idle statuses.

#### Scenario: Running state is green

- **WHEN** the global display state is `running`
- **THEN** the compact island shows a green status light and running label

#### Scenario: Waiting state is yellow

- **WHEN** the global display state is `waiting`
- **THEN** the compact island shows a yellow status light and waiting label

#### Scenario: Completed or error state is red

- **WHEN** the global display state is `completed` or `error`
- **THEN** the compact island shows a red status light and an appropriate completion or error label

### Requirement: Island expands to show details

The system SHALL expand the island on hover or click to show session details without opening a full dashboard window.

#### Scenario: Expanded island shows session metadata

- **WHEN** the user hovers over or clicks the compact island
- **THEN** the island expands to show source, project or cwd, model, current action, elapsed time, and active session count when available

#### Scenario: Expanded island collapses

- **WHEN** the pointer leaves the island or the user clicks outside according to the UI interaction model
- **THEN** the island returns to compact size

### Requirement: Overlay avoids blocking normal desktop use

The system SHALL avoid blocking clicks outside the visible island controls.

#### Scenario: Transparent area does not consume normal clicks

- **WHEN** the user clicks outside the visible island body in the transparent overlay area
- **THEN** the click reaches the underlying desktop or application where the platform allows it
```

## openspec/changes/codex-traffic-light-monitor/specs/win11-app-operations/spec.md

- Source: openspec/changes/codex-traffic-light-monitor/specs/win11-app-operations/spec.md
- Lines: 1-57
- SHA256: 822ec04827e2abf9304670582d6d012c7deafa61f437b4cb17333ee110642a5f

```md
## ADDED Requirements

### Requirement: App provides hook installation

The system SHALL provide a command that installs Codex Light hooks into the user's Codex configuration idempotently on Windows.

#### Scenario: Install hooks first time

- **WHEN** the user runs the hook installation command and no Codex Light hook block exists
- **THEN** the system backs up the target config and adds hook handlers that invoke the Codex Light hook command

#### Scenario: Install hooks repeatedly

- **WHEN** the user runs the hook installation command after hooks are already installed
- **THEN** the system leaves a single Codex Light hook block and reports that installation is already current

### Requirement: App provides diagnostics

The system SHALL provide a doctor command that checks runtime health and reports actionable failures.

#### Scenario: Doctor checks state path

- **WHEN** the user runs the doctor command
- **THEN** the system verifies the runtime directory is writable and reports the state file path

#### Scenario: Doctor checks Codex hook config

- **WHEN** the user runs the doctor command
- **THEN** the system reports whether Codex Light hooks are installed and whether the hook executable path exists

### Requirement: App supports tray controls

The system SHALL provide a Win11 tray entry for common controls.

#### Scenario: Tray menu toggles overlay visibility

- **WHEN** the user selects the tray option to hide or show the island
- **THEN** the overlay visibility changes without stopping hook ingestion

#### Scenario: Tray menu opens diagnostics

- **WHEN** the user selects diagnostics from the tray menu
- **THEN** the app opens or displays diagnostic status for hook installation and runtime state

### Requirement: Development workflow verifies behavior

The system SHALL include automated checks for core state behavior, hook ingestion, and UI rendering.

#### Scenario: Tests cover state normalization

- **WHEN** the test suite runs
- **THEN** fixture-based tests verify hook payload normalization and aggregate priority rules

#### Scenario: Visual checks cover island states

- **WHEN** visual verification runs
- **THEN** screenshots confirm the compact and expanded island render nonblank, correctly positioned, and visually distinct across key states
```

