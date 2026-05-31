---
change: enhance-island-ui-settings
design-doc: docs/superpowers/specs/2026-05-31-enhance-island-ui-settings-design.md
base-ref: 7eada42dff432ede77bebcf364c95cc24a68b41f
---

# UI 表现增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable top-island presentation, monitor/position/opacity/size settings, and app startup control after the status-stability gate is satisfied.

**Architecture:** The main process owns settings persistence, display enumeration, overlay bounds, opacity, and startup state. The renderer owns the compact/expanded island presentation and a separate settings surface opened from tray/background controls. IPC stays typed through `src/main/ipc-types.ts` and `src/main/preload.ts`.

**Tech Stack:** Electron BrowserWindow/screen/app APIs, React 19, TypeScript, Vitest, Testing Library, Playwright visual checks, existing `zod` dependency for validation.

---

## File Structure

- Create `src/main/overlay-settings.ts`: typed settings defaults, JSON persistence, validation, clamping.
- Create `src/main/overlay-bounds.ts`: pure display/bounds calculation for compact and expanded overlay windows.
- Create `src/main/startup.ts`: app-level startup adapter with injectable Electron app methods for tests.
- Modify `src/main/main.ts`: load settings, create/open settings window, apply bounds/opacity/size, react to display changes, wire IPC.
- Modify `src/main/ipc-types.ts`: extend the exposed API types and settings/display DTOs.
- Modify `src/main/preload.ts`: expose settings, display, and startup IPC functions.
- Modify `src/renderer/App.tsx`: compact/expanded metadata hierarchy and elapsed time.
- Create `src/renderer/SettingsApp.tsx`: settings surface controls.
- Modify `src/renderer/main.tsx`: route `?view=settings` to `SettingsApp`, otherwise render the island.
- Modify `src/renderer/styles.css`: compact/expanded island and settings surface styles.
- Create tests under `tests/main/` and `tests/renderer/`; update `tests/visual/island.spec.ts`.

## Task 0: Stability Gate

**Files:**
- Read: `openspec/changes/enhance-island-ui-settings/tasks.md`
- Read: active stability change artifacts, if any exist when implementation starts

- [x] **Step 0.1: Confirm the prerequisite status-stability work is done**

Check active changes and current branch state:

```bash
openspec list
git status -sb
```

Expected: no conflicting active implementation for status accuracy, or the status work has been explicitly completed/approved before UI implementation begins.

- [x] **Step 0.2: Run baseline validation**

Run:

```bash
npm run typecheck
npm test
npm run lint
```

Expected: all three commands pass before product code edits begin.

## Task 1: Settings Model and Persistence

**Files:**
- Create: `src/main/overlay-settings.ts`
- Create: `tests/main/overlay-settings.test.ts`

- [x] **Step 1.1: Write failing settings tests**

Create tests that assert these defaults and boundaries:

```typescript
expect(DEFAULT_OVERLAY_SETTINGS).toEqual({
  version: 1,
  alignment: 'top-center',
  targetDisplayId: 'primary',
  opacity: 0.96,
  sizeScale: 1,
  startOnLogin: false
});
```

Also cover invalid persisted values:

```typescript
expect(normalizeOverlaySettings({ opacity: 0.1 }).opacity).toBe(0.72);
expect(normalizeOverlaySettings({ opacity: 2 }).opacity).toBe(1);
expect(normalizeOverlaySettings({ sizeScale: 0.2 }).sizeScale).toBe(0.85);
expect(normalizeOverlaySettings({ sizeScale: 2 }).sizeScale).toBe(1.25);
expect(normalizeOverlaySettings({ alignment: 'bottom-left' }).alignment).toBe('top-center');
```

Run:

```bash
npm test -- tests/main/overlay-settings.test.ts
```

Expected: FAIL because the module does not exist.

- [x] **Step 1.2: Implement the settings module**

Implement these exports:

```typescript
export type OverlayAlignment = 'top-center' | 'top-left' | 'top-right';
export type OverlayTargetDisplayId = 'primary' | number;

export interface OverlaySettings {
  version: 1;
  alignment: OverlayAlignment;
  targetDisplayId: OverlayTargetDisplayId;
  opacity: number;
  sizeScale: number;
  startOnLogin: boolean;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  version: 1,
  alignment: 'top-center',
  targetDisplayId: 'primary',
  opacity: 0.96,
  sizeScale: 1,
  startOnLogin: false
};
```

Add `normalizeOverlaySettings`, `loadOverlaySettings(userDataDir)`, and `saveOverlaySettings(userDataDir, settings)` using atomic JSON writes where practical.

- [x] **Step 1.3: Verify settings tests pass**

Run:

```bash
npm test -- tests/main/overlay-settings.test.ts
```

Expected: PASS.

## Task 2: Overlay Bounds and Display Selection

**Files:**
- Create: `src/main/overlay-bounds.ts`
- Create: `tests/main/overlay-bounds.test.ts`

- [x] **Step 2.1: Write failing bounds tests**

Cover primary behavior:

```typescript
const display = { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
expect(computeOverlayBounds(display, 'compact', { alignment: 'top-center', sizeScale: 1 }))
  .toMatchObject({ x: 810, y: 10, width: 300, height: 78 });
```

Cover left/right alignment, scaled sizes, and fallback display selection:

```typescript
expect(selectOverlayDisplay(displays, 'primary').id).toBe(primary.id);
expect(selectOverlayDisplay(displays, 2).id).toBe(2);
expect(selectOverlayDisplay(displays, 99).id).toBe(primary.id);
```

Run:

```bash
npm test -- tests/main/overlay-bounds.test.ts
```

Expected: FAIL because the module does not exist.

- [x] **Step 2.2: Implement pure bounds helpers**

Implement:

```typescript
export type OverlayMode = 'compact' | 'expanded';

export function overlaySizeForMode(mode: OverlayMode, sizeScale: number): { width: number; height: number };
export function selectOverlayDisplay(displays: DisplayLike[], target: OverlayTargetDisplayId): DisplayLike;
export function computeOverlayBounds(display: DisplayLike, mode: OverlayMode, settings: Pick<OverlaySettings, 'alignment' | 'sizeScale'>): Electron.Rectangle;
```

Keep base sizes equal to current behavior: compact `300x78`, expanded `580x128`.

- [x] **Step 2.3: Verify bounds tests pass**

Run:

```bash
npm test -- tests/main/overlay-bounds.test.ts
```

Expected: PASS.

## Task 3: Main Process, IPC, and Window Application

**Files:**
- Modify: `src/main/main.ts`
- Modify: `src/main/ipc-types.ts`
- Modify: `src/main/preload.ts`
- Test: `tests/main/overlay-bounds.test.ts`
- Test: `tests/main/overlay-settings.test.ts`

- [x] **Step 3.1: Extend IPC types**

Add DTOs:

```typescript
export interface OverlayDisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface CodexLightSettingsState {
  settings: OverlaySettings;
  displays: OverlayDisplayInfo[];
}
```

Extend `CodexLightApi` with:

```typescript
getSettings(): Promise<CodexLightSettingsState>;
updateSettings(patch: Partial<OverlaySettings>): Promise<CodexLightSettingsState>;
onSettingsChanged(callback: (state: CodexLightSettingsState) => void): () => void;
```

- [x] **Step 3.2: Wire preload IPC**

In `src/main/preload.ts`, expose `ipcRenderer.invoke('settings:get')`, `ipcRenderer.invoke('settings:update', patch)`, and an event listener for `settings:changed`.

- [x] **Step 3.3: Apply settings in main**

In `src/main/main.ts`:

- track `overlaySettings`;
- track current expanded state;
- replace direct `positionOverlay(COMPACT)` calls with `applyOverlayBounds()`;
- call `overlay.setOpacity(settings.opacity)`;
- listen to `screen.on('display-added')`, `screen.on('display-removed')`, and `screen.on('display-metrics-changed')`;
- add tray item `Settings` above `Show Island`.

- [x] **Step 3.4: Run focused validation**

Run:

```bash
npm run typecheck
npm test -- tests/main/overlay-settings.test.ts tests/main/overlay-bounds.test.ts
```

Expected: PASS.

## Task 4: Compact and Expanded Island Presentation

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/demo-snapshot.ts`
- Modify: `tests/renderer/App.test.tsx`

- [x] **Step 4.1: Write failing renderer tests**

Add tests for compact mode:

```typescript
render(<App initialSnapshot={snapshot} initialExpanded={false} />);
expect(screen.getByText('demo')).toBeInTheDocument();
expect(screen.queryByText('等待确认')).not.toBeInTheDocument();
expect(screen.queryByText('gpt-5.5')).not.toBeInTheDocument();
expect(screen.queryByText('C:\\code\\demo')).not.toBeInTheDocument();
```

Add tests for expanded mode:

```typescript
render(<App initialSnapshot={snapshot} initialExpanded />);
expect(screen.getByText('Waiting for approval: Bash')).toBeInTheDocument();
expect(screen.getByText('gpt-5.5')).toBeInTheDocument();
expect(screen.getByText('C:\\code\\demo')).toBeInTheDocument();
expect(screen.getByText(/2s|2 秒/)).toBeInTheDocument();
```

Run:

```bash
npm test -- tests/renderer/App.test.tsx
```

Expected: FAIL until presentation is updated.

- [x] **Step 4.2: Implement compact and expanded metadata**

Compact:

- render status dot;
- render project name or idle fallback label;
- render count only when `activeSessionCount > 1`;
- do not render state label, source, model, cwd, or action.

Expanded:

- render current action/tool;
- render model;
- render cwd;
- render elapsed time;
- render source and session count.

- [x] **Step 4.3: Add elapsed-time helper**

Keep it renderer-only:

```typescript
function formatElapsed(session: CodexSession, now: Date): string {
  const start = Date.parse(session.startedAt);
  const end = session.state === 'completed' ? Date.parse(session.updatedAt) : now.getTime();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [x] **Step 4.4: Verify renderer tests pass**

Run:

```bash
npm test -- tests/renderer/App.test.tsx
```

Expected: PASS.

## Task 5: Settings Surface

**Files:**
- Create: `src/renderer/SettingsApp.tsx`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `src/main/main.ts`
- Create: `tests/renderer/SettingsApp.test.tsx`

- [x] **Step 5.1: Write failing settings UI tests**

Assert the settings UI calls the exposed API and renders controls:

```typescript
expect(screen.getByRole('combobox', { name: /位置|position/i })).toBeInTheDocument();
expect(screen.getByRole('combobox', { name: /显示器|display/i })).toBeInTheDocument();
expect(screen.getByRole('slider', { name: /透明度|opacity/i })).toBeInTheDocument();
expect(screen.getByRole('slider', { name: /尺寸|size/i })).toBeInTheDocument();
expect(screen.getByRole('checkbox', { name: /开机启动|startup/i })).toBeInTheDocument();
```

Run:

```bash
npm test -- tests/renderer/SettingsApp.test.tsx
```

Expected: FAIL because the component does not exist.

- [x] **Step 5.2: Route settings window rendering**

In `src/renderer/main.tsx`, render `SettingsApp` when `new URLSearchParams(window.location.search).get('view') === 'settings'`; otherwise render `App`.

- [x] **Step 5.3: Create settings BrowserWindow**

In `src/main/main.ts`, add `createOrShowSettingsWindow()` that loads the same renderer URL/file with `?view=settings`, uses a normal framed window, and keeps hook ingestion running.

- [x] **Step 5.4: Implement settings controls**

Controls:

- segmented/select control for top alignment;
- select for displays with primary marker;
- opacity slider clamped to the settings range;
- size slider clamped to the settings range;
- startup checkbox bound to settings/startup state.

- [x] **Step 5.5: Verify settings UI tests pass**

Run:

```bash
npm test -- tests/renderer/SettingsApp.test.tsx
```

Expected: PASS.

## Task 6: Startup Preference Adapter

**Files:**
- Create: `src/main/startup.ts`
- Create: `tests/main/startup.test.ts`
- Modify: `src/main/main.ts`

- [x] **Step 6.1: Write failing startup adapter tests**

Use an injectable adapter shape:

```typescript
const appAdapter = {
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  setLoginItemSettings: vi.fn()
};
```

Assert:

```typescript
expect(readStartupEnabled(appAdapter)).toBe(false);
setStartupEnabled(appAdapter, true);
expect(appAdapter.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({ openAtLogin: true }));
```

Run:

```bash
npm test -- tests/main/startup.test.ts
```

Expected: FAIL because the module does not exist.

- [x] **Step 6.2: Implement startup adapter**

Export:

```typescript
export function readStartupEnabled(appLike: StartupAppLike): boolean;
export function setStartupEnabled(appLike: StartupAppLike, enabled: boolean): void;
```

Guard unsupported/dev edge cases by returning a stable disabled state or throwing a controlled error that IPC converts into a settings diagnostic message.

- [x] **Step 6.3: Connect startup to settings updates**

When `updateSettings({ startOnLogin })` is invoked, call the startup adapter, persist the resulting setting, and publish `settings:changed`.

- [x] **Step 6.4: Verify startup tests pass**

Run:

```bash
npm test -- tests/main/startup.test.ts
```

Expected: PASS.

## Task 7: Visual and Full Verification

**Files:**
- Modify: `tests/visual/island.spec.ts`
- Modify: `openspec/changes/enhance-island-ui-settings/tasks.md`

- [x] **Step 7.1: Update visual tests for compact behavior**

Current visual tests expect `.summary-text strong` to show state labels. Replace those assertions with compact expectations:

```typescript
await expect(page.locator('.status-dot')).toBeVisible();
await expect(page.locator('.summary-text')).toContainText('codex-light');
await expect(page.locator('.summary-text strong')).not.toHaveText('等待确认');
```

- [x] **Step 7.2: Add expanded visual check**

Trigger hover or load a test route/state that starts expanded, then assert action/model/cwd/elapsed metadata are visible.

- [x] **Step 7.3: Run full validation**

Run:

```bash
npm run typecheck
npm test
npm run lint
npm run test:visual
```

Expected: typecheck, Vitest, ESLint, and Playwright checks pass locally. If Playwright cannot run in the current environment, record the exact blocker and keep the unit/integration checks passing.

- [x] **Step 7.4: Update OpenSpec task checkboxes**

Mark completed items in `openspec/changes/enhance-island-ui-settings/tasks.md` only after the corresponding implementation and verification pass.

- [x] **Step 7.5: Commit implementation milestone**

Use one semantic commit if the implementation stays cohesive:

```bash
git add src tests openspec/changes/enhance-island-ui-settings docs/superpowers
git commit -m "feat(ui): 增强顶部岛显示和设置"
```

Expected: commit succeeds after verification.

## Self-Review

- Spec coverage: compact mode, expanded metadata, top alignment, display selection, opacity, size, settings surface, startup preference, and stability-first ordering are all mapped to tasks.
- Completion scan: plan contains no blank or deferred instructions.
- Type consistency: settings types flow from `overlay-settings.ts` into IPC, main process window application, and renderer settings controls.
- Scope: the plan excludes diagnostics, auto-update, arbitrary dragging, and hook/state ingestion rewrites.
