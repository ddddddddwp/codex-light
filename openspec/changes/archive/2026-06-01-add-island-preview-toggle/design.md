## Summary

Add a settings-only preview toggle for the dynamic-island traffic light. The preview is a local visual aid inside the settings window and must not drive the real overlay window or Codex state.

## Approach

- Extend `OverlaySettings` with a boolean field such as `trafficLightPreviewEnabled`.
- Default the field to enabled so users can inspect the preview without extra setup.
- Normalize persisted settings so missing or invalid values fall back to the default.
- Add a checkbox/toggle in `SettingsApp` labeled for allowing the traffic-light preview.
- Render a small static island preview in the settings page only when the toggle is enabled.
- Use fixed demo values for the preview; do not call `setPinnedExpanded`, do not publish snapshots, and do not mutate live overlay state.

## Data Flow

```text
settings window toggle
  -> codexLight.updateSettings({ trafficLightPreviewEnabled })
  -> main process normalizes and saves OverlaySettings
  -> settings changed event updates settings window
  -> settings page conditionally renders local preview
```

The real overlay continues to render only from snapshot events and existing overlay settings such as position, opacity, size, and language.

## Non-Goals

- No new real overlay mode.
- No device management model beyond this single settings flag.
- No preview-driven status simulation for the live island.
- No changes to Codex session ingestion or polling.

## Risks

- The preview could accidentally call live overlay IPC. Tests must assert that settings preview rendering does not call `setPinnedExpanded`.
- Settings layout could become crowded. Keep the preview compact and visually subordinate to settings controls.
