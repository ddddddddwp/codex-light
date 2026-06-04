---
astrolabe_change: add-island-preview-toggle
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-01-add-island-preview-toggle
status: final
---

# Island Preview Toggle Design

## Summary

Add a persisted settings-page toggle that controls whether Codex Light shows a local dynamic-island traffic-light preview in the settings window. The preview is only a visual aid for the settings page and must not change the real overlay window, live Codex status, polling, tray behavior, or overlay expansion state.

## Requirements Source

Canonical requirements live in `openspec/changes/add-island-preview-toggle/specs/top-island-overlay/spec.md`.

The user-selected behavior is option A from visual brainstorming:

- Provide a setting for whether the traffic-light preview can be shown.
- When enabled, show a small local preview in the settings page.
- When disabled, hide or disable that preview.
- Do not affect normal app usage.

## Architecture

The feature extends the existing `OverlaySettings` persistence path rather than adding a new preview subsystem.

```text
SettingsApp checkbox
  -> codexLight.updateSettings({ trafficLightPreviewEnabled })
  -> ipcMain settings:update
  -> normalizeOverlaySettings()
  -> saveOverlaySettings()
  -> settings:changed event
  -> SettingsApp re-renders local preview
```

The overlay renderer (`App`) continues to receive live snapshots and existing settings. It does not need a preview mode for this feature.

## Data Model

Add a boolean field to `OverlaySettings`:

```ts
trafficLightPreviewEnabled: boolean;
```

Default value:

```ts
trafficLightPreviewEnabled: true;
```

Normalization rules:

- Missing value falls back to `true`.
- Non-boolean value falls back to `true`.
- Valid boolean value is preserved.

This keeps older settings files compatible and avoids breaking users who already have `overlay-settings.json`.

## Settings UI

Add one binary setting in `SettingsApp`:

- Chinese label: `允许预览红绿灯`
- English label: `Allow traffic-light preview`

When enabled, the settings page renders a compact local island preview with a static demo state. The preview should use existing visual language from the real island: dark rounded body, one colored status dot, and a short label.

When disabled, the preview is not rendered. This keeps the setting simple and makes the effect obvious.

## Isolation From Live Overlay

The preview must not call:

- `codexLight.setPinnedExpanded`
- snapshot subscription update paths
- main-process overlay bounds updates

The only IPC triggered by the toggle should be the existing settings update path.

The preview must not alter:

- `globalState`
- active sessions
- real overlay show/hide
- real overlay hover/click behavior
- polling behavior

## Testing Strategy

Add or update tests at three layers:

1. `tests/main/overlay-settings.test.ts`
   - Default settings include `trafficLightPreviewEnabled: true`.
   - Normalization preserves `false`.
   - Invalid persisted values fall back to `true`.

2. `tests/renderer/SettingsApp.test.tsx`
   - The preview is visible when the setting is enabled.
   - The preview is hidden when the setting is disabled.
   - Toggling the checkbox calls `updateSettings({ trafficLightPreviewEnabled: ... })`.
   - Rendering/toggling the preview does not call `setPinnedExpanded`.

3. `tests/visual/island.spec.ts` or a focused renderer test if visual coverage is enough
   - Confirm the preview can be inspected in the settings route without affecting the live island route.

Run at minimum:

```bash
npm test -- tests/main/overlay-settings.test.ts tests/renderer/SettingsApp.test.tsx
npm run typecheck
```

For final verification, also run:

```bash
npm test
npm run lint
npm run build
```

## Implementation Notes

- Reuse the existing `settings-checkbox` styling for the toggle.
- Add compact preview CSS under settings-specific classes so the real `.island` runtime styles are not coupled to settings layout.
- Keep the preview static. Do not create a preview state picker or simulation control in this change.
- If layout becomes crowded, place the preview below the toggle with restrained sizing.

## Risks And Mitigations

- **Risk:** preview accidentally controls the live overlay.
  **Mitigation:** tests assert `setPinnedExpanded` is not called by settings preview rendering or toggling.

- **Risk:** older settings files fail normalization.
  **Mitigation:** boolean fallback keeps missing or invalid values safe.

- **Risk:** preview creates duplicate behavior with the live island component.
  **Mitigation:** keep the preview as a static settings-only visual, not a second runtime island implementation.
