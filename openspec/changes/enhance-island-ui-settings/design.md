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

- Keep startup only in NSIS: works at install time, but users cannot change it later from the app.
- Create only a Startup-folder shortcut from app code: matches installer behavior, but Electron login item APIs are the primary app-level abstraction where available.

Rationale: users expect startup to be configurable after installation. The implementation can choose the Windows-compatible mechanism while keeping one UI contract.

## Risks / Trade-offs

- [Risk] Display IDs can change when monitors are unplugged or reordered. → Fall back to primary display and keep the saved selection for when the display returns.
- [Risk] Smaller size settings can make cwd/model/tool text unreadable. → Clamp size presets/ranges and use ellipsis for long values.
- [Risk] Very low opacity can make status unreadable. → Clamp opacity to a readable range and keep status dot contrast intact.
- [Risk] Startup behavior differs between dev, portable, and installed builds. → Surface current startup status from the main process and test the preference logic behind an injectable adapter.
- [Risk] Hover and click expansion can fight each other. → Preserve the existing interaction for now, but isolate expansion mode changes from settings persistence.

## Migration Plan

- On first launch after implementation, create default settings equivalent to current behavior.
- If a saved display target is unavailable, position on the primary display without deleting the saved preference.
- Existing users do not need manual migration.

## Open Questions

- The exact UI copy and visual polish of the settings panel can be refined during implementation, but the placement and behavior contract are fixed by this design.
