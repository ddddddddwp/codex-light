---
change: add-island-preview-toggle
design-doc: docs/superpowers/specs/2026-06-01-island-preview-toggle-design.md
base-ref: 4158df21f0d2e44043f3ffcb0df722f0f4ea05cb
archived-with: 2026-06-01-add-island-preview-toggle
---

# Island Preview Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted settings-page toggle that controls whether a local dynamic-island traffic-light preview is shown, without affecting the real overlay.

**Architecture:** Extend `OverlaySettings` with `trafficLightPreviewEnabled`, normalize/persist it through the existing settings pipeline, and render a settings-only static preview in `SettingsApp`. The live overlay renderer remains driven by snapshots and existing overlay settings.

**Tech Stack:** Electron IPC, TypeScript, React, CSS, Vitest, Testing Library.

archived-with: 2026-06-01-add-island-preview-toggle
---

## Files

- Modify: `src/main/overlay-settings.ts`
- Modify: `src/renderer/SettingsApp.tsx`
- Modify: `src/renderer/styles.css`
- Test: `tests/main/overlay-settings.test.ts`
- Test: `tests/renderer/SettingsApp.test.tsx`
- Track: `openspec/changes/add-island-preview-toggle/tasks.md`

## CodeGraph Context

- `OverlaySettings` impacts settings normalization, settings IPC state, main overlay settings state, and settings renderer tests.
- `SettingsApp` is the isolated UI entry for the settings page; CodeGraph shows no broader callers beyond the renderer entry.
- Relevant test candidates: `tests/main/overlay-settings.test.ts`, `tests/renderer/SettingsApp.test.tsx`, plus `npm run typecheck`.

## Task 1: Persist Preview Setting

**Files:**
- Modify: `src/main/overlay-settings.ts`
- Test: `tests/main/overlay-settings.test.ts`

- [ ] **Step 1: Add failing normalization tests**

Add assertions to `tests/main/overlay-settings.test.ts`:

```ts
it('defaults traffic-light preview support to enabled', () => {
  expect(normalizeOverlaySettings({}).trafficLightPreviewEnabled).toBe(true);
});

it('preserves disabled traffic-light preview support', () => {
  expect(normalizeOverlaySettings({ trafficLightPreviewEnabled: false }).trafficLightPreviewEnabled).toBe(false);
});

it('falls back to enabled for invalid traffic-light preview values', () => {
  expect(normalizeOverlaySettings({ trafficLightPreviewEnabled: 'no' }).trafficLightPreviewEnabled).toBe(true);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
npm test -- tests/main/overlay-settings.test.ts
```

Expected: FAIL because `trafficLightPreviewEnabled` does not exist on normalized settings.

- [ ] **Step 3: Implement setting field**

In `src/main/overlay-settings.ts`, extend the interface and defaults:

```ts
export interface OverlaySettings {
  version: 1;
  alignment: OverlayAlignment;
  targetDisplayId: OverlayTargetDisplayId;
  opacity: number;
  sizeScale: number;
  startOnLogin: boolean;
  language: OverlayLanguage;
  trafficLightPreviewEnabled: boolean;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  version: 1,
  alignment: 'top-center',
  targetDisplayId: 'primary',
  opacity: 0.96,
  sizeScale: 1,
  startOnLogin: false,
  language: 'zh-CN',
  trafficLightPreviewEnabled: true
};
```

In `normalizeOverlaySettings`, add the returned field:

```ts
trafficLightPreviewEnabled: typeof persisted.trafficLightPreviewEnabled === 'boolean'
  ? persisted.trafficLightPreviewEnabled
  : DEFAULT_OVERLAY_SETTINGS.trafficLightPreviewEnabled
```

- [ ] **Step 4: Run tests and confirm GREEN**

Run:

```bash
npm test -- tests/main/overlay-settings.test.ts
```

Expected: PASS.

## Task 2: Add Settings Toggle And Preview

**Files:**
- Modify: `src/renderer/SettingsApp.tsx`
- Modify: `src/renderer/styles.css`
- Test: `tests/renderer/SettingsApp.test.tsx`

- [ ] **Step 1: Add failing UI tests**

Add tests to `tests/renderer/SettingsApp.test.tsx`:

```tsx
it('shows a local traffic-light preview when preview support is enabled', async () => {
  installApi({
    getSettings: vi.fn(async () => ({
      ...baseState,
      settings: {
        ...baseState.settings,
        trafficLightPreviewEnabled: true
      }
    }))
  });

  render(<SettingsApp />);

  expect(await screen.findByLabelText('红绿灯预览')).toBeInTheDocument();
  expect(screen.getByText('codex-light')).toBeInTheDocument();
});

it('hides the local traffic-light preview when preview support is disabled', async () => {
  installApi({
    getSettings: vi.fn(async () => ({
      ...baseState,
      settings: {
        ...baseState.settings,
        trafficLightPreviewEnabled: false
      }
    }))
  });

  render(<SettingsApp />);

  expect(await screen.findByLabelText('允许预览红绿灯')).not.toBeChecked();
  expect(screen.queryByLabelText('红绿灯预览')).not.toBeInTheDocument();
});

it('updates preview support without changing the live overlay expansion state', async () => {
  const updateSettings = vi.fn(async (patch) => ({
    ...baseState,
    settings: {
      ...baseState.settings,
      ...patch
    }
  }));
  const setPinnedExpanded = vi.fn(async () => undefined);
  installApi({ updateSettings, setPinnedExpanded });

  render(<SettingsApp />);

  fireEvent.click(await screen.findByLabelText('允许预览红绿灯'));

  expect(updateSettings).toHaveBeenCalledWith({ trafficLightPreviewEnabled: false });
  expect(setPinnedExpanded).not.toHaveBeenCalled();
});
```

Make sure `baseState.settings` in the test fixture includes `trafficLightPreviewEnabled: true`.

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
npm test -- tests/renderer/SettingsApp.test.tsx
```

Expected: FAIL because the label and preview do not exist.

- [ ] **Step 3: Add copy entries**

In `src/renderer/SettingsApp.tsx`, extend the `COPY` shape with:

```ts
trafficLightPreview: string;
trafficLightPreviewLabel: string;
```

Chinese copy:

```ts
trafficLightPreview: '允许预览红绿灯',
trafficLightPreviewLabel: '红绿灯预览'
```

English copy:

```ts
trafficLightPreview: 'Allow traffic-light preview',
trafficLightPreviewLabel: 'Traffic-light preview'
```

- [ ] **Step 4: Render toggle and local preview**

In the settings form, add:

```tsx
<label className="settings-checkbox">
  <input
    type="checkbox"
    checked={state.settings.trafficLightPreviewEnabled}
    onChange={(event) => updateSettings({ trafficLightPreviewEnabled: event.currentTarget.checked })}
  />
  <span>{copy.trafficLightPreview}</span>
</label>

{state.settings.trafficLightPreviewEnabled && (
  <section className="settings-preview" aria-label={copy.trafficLightPreviewLabel}>
    <div className="settings-preview-island">
      <span className="settings-preview-dot" aria-hidden="true" />
      <strong>codex-light</strong>
    </div>
  </section>
)}
```

Do not call `codexLight.setPinnedExpanded` anywhere in this preview code.

- [ ] **Step 5: Add settings preview styles**

In `src/renderer/styles.css`, add settings-scoped classes:

```css
.settings-preview {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

.settings-preview-island {
  width: 220px;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  color: #fff;
  background: rgba(12, 16, 23, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.settings-preview-island strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.settings-preview-dot {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border-radius: 999px;
  color: #31d27c;
  background: #31d27c;
  box-shadow: 0 0 18px currentColor;
}
```

- [ ] **Step 6: Run tests and confirm GREEN**

Run:

```bash
npm test -- tests/renderer/SettingsApp.test.tsx
```

Expected: PASS.

## Task 3: Verify Contracts And Update Checklist

**Files:**
- Modify: `openspec/changes/add-island-preview-toggle/tasks.md`

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm test -- tests/main/overlay-settings.test.ts tests/renderer/SettingsApp.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run full verification before build completion**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Mark OpenSpec tasks complete**

Update `openspec/changes/add-island-preview-toggle/tasks.md`:

```md
- [x] Extend overlay settings with persisted traffic-light preview support.
- [x] Add settings UI toggle and local preview rendering that does not affect live overlay state.
- [x] Add regression tests for settings normalization, UI toggle behavior, and live-overlay isolation.
- [x] Run focused and full verification.
```

- [ ] **Step 4: Commit milestone**

Stage only files for this change:

```bash
git add \
  src/main/overlay-settings.ts \
  src/renderer/SettingsApp.tsx \
  src/renderer/styles.css \
  tests/main/overlay-settings.test.ts \
  tests/renderer/SettingsApp.test.tsx \
  openspec/changes/add-island-preview-toggle \
  docs/superpowers/specs/2026-06-01-island-preview-toggle-design.md \
  docs/superpowers/plans/2026-06-01-island-preview-toggle.md

git commit -m "feat(settings): 增加灵动岛红绿灯预览开关"
```

Commit body should mention:

```text
Astrolabe change: add-island-preview-toggle
验证: npm test; npm run lint; npm run build
OpenSpec: top-island-overlay preview-support scenarios
```
