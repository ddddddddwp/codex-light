# Astrolabe Design Handoff

- Change: enhance-island-ui-settings
- Phase: design
- Mode: compact
- Context hash: f224a96b8b74f35313d6ff940c1f3a441368f3bb0a2c24bd20fe5442273b385f

Generated-by: ast-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/enhance-island-ui-settings/proposal.md

- Source: openspec/changes/enhance-island-ui-settings/proposal.md
- Lines: 1-35
- SHA256: 27fb8ad5f4d3de838b24f5317ca54c1f8e20a4ccbdba0bd3ce84d9a17fdf72da

```md
## Why

Codex Light 当前顶部岛的展示密度、窗口位置和尺寸都是固定的，紧凑模式仍暴露过多状态文本，展开模式也没有完整呈现工具名、模型、cwd 和耗时等排障信息。用户需要在完成状态准确性和稳定性工作之后，能够按自己的桌面布局调整岛的位置、透明度、尺寸和开机启动行为。

## What Changes

- 调整岛的两种展示密度：
  - 紧凑模式只显示状态灯和项目名，保留多会话数量提示。
  - 展开模式显示工具名、模型、cwd、耗时和会话来源等详情。
- 增加可持久化的 UI 偏好：
  - 顶部居中、顶部左侧、顶部右侧位置。
  - 目标显示器选择，默认跟随主显示器。
  - 透明度和尺寸设置。
- 增加设置入口，不把复杂设置塞进红绿灯本体。
- 增加开机启动设置，与 Windows/Electron 登录启动状态保持一致。
- 明确实施优先级：本变更只在稳定性和状态准确性工作之后进入实现。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `top-island-overlay`: add compact/expanded presentation rules, configurable top alignment, display selection, opacity, and size behavior.
- `win11-app-operations`: add settings access and app startup configuration behavior.

## Impact

- Renderer UI: `src/renderer/App.tsx` and styles for compact/expanded island metadata layout.
- Main process window management: `src/main/main.ts` for display enumeration, overlay bounds, opacity, size, and settings application.
- Preload/IPC contract: `src/main/preload.ts` and `src/main/ipc-types.ts` for settings read/write and display/startup controls.
- Settings persistence: likely a small main-process settings module under `src/main/`.
- Tests: renderer behavior, settings validation/persistence, window bounds calculations, and startup-setting integration tests.
```

## openspec/changes/enhance-island-ui-settings/design.md

- Source: openspec/changes/enhance-island-ui-settings/design.md
- Lines: 1-103
- SHA256: fee1144b7452ea1a1f0bf1f9b7677bac8144be33c358444a7c39060a6df4015e

[TRUNCATED]

```md
## Context

The current app has a single transparent Electron overlay window. `src/main/main.ts` creates it with fixed compact and expanded bounds, positions it at the top center of the primary display, and exposes only `set-pinned-expanded` over IPC. `src/renderer/App.tsx` renders a compact summary and hover/click expanded details from the latest `CodexLightSnapshot`; there is no settings persistence, display selection, opacity control, or in-app startup toggle.

The requested UI work is intentionally lower priority than status accuracy and stability work. This change therefore defines the UI/settings contract and implementation plan without changing runtime behavior yet.

## Goals / Non-Goals

**Goals:**

- Make compact mode quiet: status light, project name, and active-session count only.
- Make expanded mode useful for inspection: tool/action, model, cwd, elapsed time, source, and session count.
- Add a separate settings panel opened from the background/tray path, not from the island body.
- Persist user preferences for top alignment, target display, opacity, size, and startup behavior.
- Keep defaults compatible with today's behavior: primary display, top center, current compact/expanded sizes, near-opaque island, startup disabled unless the installer/user enables it.
- Defer implementation until stability and status accuracy work is complete.

**Non-Goals:**

- No diagnostic panel in this change.
- No automatic update system.
- No arbitrary free-floating window placement or drag-to-position behavior.
- No redesign of hook ingestion, session aggregation, or status priority rules.

## Decisions

### 1. Use a settings panel opened from tray/background controls

Recommended approach: add a small settings window or panel launched from the tray menu. The island remains a status surface only.

Alternatives considered:

- Put controls inside the expanded island: fastest to implement, but it makes the red/green light surface harder to scan and conflicts with the user's preference to keep diagnostics/settings out of the island.
- Use only tray submenu items: lightweight, but poor for sliders, display selection, and explaining current values.

Rationale: a dedicated settings surface keeps compact/expanded island behavior predictable and gives enough room for display, opacity, size, and startup controls.

### 2. Store overlay preferences in a main-process settings module

Recommended approach: introduce a typed settings object owned by the main process, persisted under `app.getPath('userData')`, exposed to the renderer via IPC.

Alternatives considered:

- Store settings in renderer localStorage: simpler, but the main process needs settings before/while positioning windows and setting startup state.
- Add a third-party settings store: convenient, but unnecessary for a small JSON document and adds dependency surface.

Rationale: the main process already owns `BrowserWindow`, `screen`, and startup behavior. Keeping validation and persistence there avoids renderer/main drift.

### 3. Compute window bounds from settings, current display list, and mode size

Recommended approach: replace fixed `COMPACT`/`EXPANDED` positioning with a pure bounds calculation helper:

- display target: primary by default, selected display ID when available
- horizontal alignment: `top-center`, `top-left`, or `top-right`
- margin: stable top/side margin
- size scale: preset or numeric multiplier applied to compact/expanded base dimensions

Alternatives considered:

- Let CSS size the island and resize the BrowserWindow reactively from measured DOM size: visually flexible, but creates more IPC and timing edge cases.
- Hard-code multiple fixed size constants: simpler initially, but brittle once user size settings exist.

Rationale: deterministic main-process bounds are easier to unit test and keep transparent click-through behavior predictable.

### 4. Use derived elapsed time in the renderer

Recommended approach: compute elapsed time from `startedAt` to now for active sessions and from `startedAt` to `updatedAt` for completed sessions, refreshing while expanded.

Alternatives considered:

- Persist elapsed time in snapshots: adds redundant state to ingestion.
- Use only `updatedAt`: easier but less useful for "how long has this been running?".

Rationale: the snapshot already carries enough timestamps, and elapsed display is a UI concern.

### 5. Startup setting is app-owned, installer remains an install-time convenience

Recommended approach: expose an app startup preference in settings that reads and writes the current Windows/Electron login-startup state. The existing installer checkbox can still create the initial startup entry, but the app setting becomes the ongoing control.

Alternatives considered:
```

Full source: openspec/changes/enhance-island-ui-settings/design.md

## openspec/changes/enhance-island-ui-settings/tasks.md

- Source: openspec/changes/enhance-island-ui-settings/tasks.md
- Lines: 1-47
- SHA256: 9f4dcfc5b9495a4e13d5ca1503264d3b7cfcf2dbb2d87f13e385a103917f9f68

```md
## 0. Stability Gate

- [ ] 0.1 Confirm status accuracy/stability work is complete enough to start UI implementation.
- [ ] 0.2 Re-run baseline `npm run typecheck`, `npm test`, and `npm run lint` before touching UI behavior.

## 1. Settings Model and IPC

- [ ] 1.1 Add a typed overlay settings model with defaults matching current behavior.
- [ ] 1.2 Add main-process persistence under the Electron user data directory.
- [ ] 1.3 Add validation/clamping for position, display target, opacity, and size settings.
- [ ] 1.4 Extend preload and IPC types for reading settings, updating settings, listing displays, and reading startup status.

## 2. Overlay Window Positioning

- [ ] 2.1 Extract a pure bounds calculation helper for compact and expanded overlay sizes.
- [ ] 2.2 Support top center, top left, and top right alignment.
- [ ] 2.3 Support selected display targeting with fallback to primary display when unavailable.
- [ ] 2.4 Apply opacity and size settings to the BrowserWindow and renderer shell.
- [ ] 2.5 Reposition the overlay when expansion state, settings, or display topology changes.

## 3. Island Presentation

- [ ] 3.1 Update compact mode to show only status light, project name or idle fallback label, and active-session count.
- [ ] 3.2 Update expanded mode to show tool/action, model, cwd, elapsed time, source, and active-session count.
- [ ] 3.3 Add elapsed-time formatting that updates while expanded without changing stored snapshots.
- [ ] 3.4 Ensure missing metadata uses stable fallback labels and does not break layout.

## 4. Settings Surface

- [ ] 4.1 Add a tray entry that opens the settings surface.
- [ ] 4.2 Implement controls for alignment, display, opacity, size, and startup.
- [ ] 4.3 Apply setting changes immediately to the existing overlay.
- [ ] 4.4 Keep the settings surface separate from the compact/expanded island UI.

## 5. Startup Preference

- [ ] 5.1 Add an app-level startup adapter for reading and writing Windows login startup state.
- [ ] 5.2 Connect the startup toggle to the settings surface.
- [ ] 5.3 Handle dev, unpackaged, and installed build differences without crashing.

## 6. Verification

- [ ] 6.1 Add unit tests for settings defaults, validation, persistence, and migration.
- [ ] 6.2 Add unit tests for overlay bounds across alignments and displays.
- [ ] 6.3 Add renderer tests for compact and expanded metadata visibility.
- [ ] 6.4 Add or update visual checks for compact/expanded island states and settings-safe layout.
- [ ] 6.5 Run `npm run typecheck`, `npm test`, and `npm run lint`.
```

## openspec/changes/enhance-island-ui-settings/specs/top-island-overlay/spec.md

- Source: openspec/changes/enhance-island-ui-settings/specs/top-island-overlay/spec.md
- Lines: 1-79
- SHA256: d61924147e7c93698c997ddc293e16e11969b9aa472cedae010db4b8fcc42f57

```md
## MODIFIED Requirements

### Requirement: Top island appears at the top center of the primary display
The system SHALL render a frameless, transparent, topmost overlay window containing a compact island at the configured top position of the selected Win11 display, defaulting to the top center of the primary display.

#### Scenario: App starts with compact island
- **WHEN** the desktop app launches with no saved overlay position setting
- **THEN** a compact island appears near the top center of the primary display without a native title bar

#### Scenario: User selects top alignment
- **WHEN** the user selects top center, top left, or top right alignment
- **THEN** the overlay moves to that top position on the selected display and keeps that position after restart

#### Scenario: User selects target display
- **WHEN** multiple displays are available and the user selects a target display
- **THEN** the overlay appears on that display using the selected top alignment

#### Scenario: Selected display is unavailable
- **WHEN** the saved target display is not available at app startup or after display changes
- **THEN** the overlay appears on the primary display without deleting the saved display preference

#### Scenario: Overlay remains above normal windows
- **WHEN** a normal application window receives focus
- **THEN** the island remains visible above that normal window

### Requirement: Island uses clear status colors and labels
The system SHALL show distinct visual states for running, waiting, completed, error, and idle statuses while compact mode remains limited to status light, project name, and active-session count.

#### Scenario: Running state is green
- **WHEN** the global display state is `running`
- **THEN** the compact island shows a green status light and the current project name when available

#### Scenario: Waiting state is yellow
- **WHEN** the global display state is `waiting`
- **THEN** the compact island shows a yellow status light and the current project name when available

#### Scenario: Idle state is red
- **WHEN** the global display state is `idle`
- **THEN** the compact island shows a red status light and an idle fallback label

#### Scenario: Completed or error state is red
- **WHEN** the global display state is `completed` or `error`
- **THEN** the compact island shows a red status light and the current project name when available

#### Scenario: Multiple active sessions are indicated
- **WHEN** more than one active session exists
- **THEN** the compact island shows the active session count without adding extra metadata text

### Requirement: Island expands to show details
The system SHALL expand the island on hover or click to show session details without opening a full dashboard window.

#### Scenario: Expanded island shows session metadata
- **WHEN** the user hovers over or clicks the compact island and at least one session exists
- **THEN** the island expands to show tool or action, model, cwd, elapsed time, session source, and active session count when available

#### Scenario: Expanded island handles missing metadata
- **WHEN** a session does not include tool, model, cwd, or timestamp values
- **THEN** the expanded island uses clear fallback labels without breaking layout

#### Scenario: Expanded island collapses
- **WHEN** the pointer leaves the island or the user clicks outside according to the UI interaction model
- **THEN** the island returns to compact size

## ADDED Requirements

### Requirement: Overlay appearance can be adjusted
The system SHALL allow users to adjust overlay opacity and size within readable, bounded ranges.

#### Scenario: User changes opacity
- **WHEN** the user changes the opacity setting
- **THEN** the island updates its visible opacity and persists the setting after restart

#### Scenario: User changes size
- **WHEN** the user changes the island size setting
- **THEN** compact and expanded overlay bounds update proportionally and persist after restart

#### Scenario: Appearance values are bounded
- **WHEN** a saved or incoming opacity or size value is outside the supported range
- **THEN** the system clamps or rejects the value and keeps the island readable
```

## openspec/changes/enhance-island-ui-settings/specs/win11-app-operations/spec.md

- Source: openspec/changes/enhance-island-ui-settings/specs/win11-app-operations/spec.md
- Lines: 1-31
- SHA256: 5490d5cf71af849c9d7d2e73eb467df8e8d5309679b64ed06c5108cfd211a267

```md
## ADDED Requirements

### Requirement: App provides UI settings controls
The system SHALL provide a settings surface for overlay presentation preferences that opens from the app's background controls instead of the compact island.

#### Scenario: Tray menu opens settings
- **WHEN** the user selects the settings option from the tray menu
- **THEN** the app opens a settings surface without stopping hook ingestion or hiding the status island

#### Scenario: Settings show current overlay preferences
- **WHEN** the settings surface opens
- **THEN** it shows the current position, display, opacity, size, and startup preferences

#### Scenario: Settings changes apply immediately
- **WHEN** the user changes an overlay presentation setting
- **THEN** the app applies the setting to the active overlay and persists it for future launches

### Requirement: App supports startup preference control
The system SHALL allow users to inspect and change whether Codex Light starts automatically after Windows login.

#### Scenario: User enables startup
- **WHEN** the user enables the startup setting
- **THEN** the app configures Codex Light to start after Windows login and reports the enabled state

#### Scenario: User disables startup
- **WHEN** the user disables the startup setting
- **THEN** the app removes Codex Light from Windows login startup and reports the disabled state

#### Scenario: Startup state is read on launch
- **WHEN** the app starts
- **THEN** the settings surface reports the current startup state from the app-level startup mechanism
```

