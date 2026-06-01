## Why

Users need a background setting that controls whether the settings page can show a dynamic-island traffic-light preview. This preview should help users inspect the visual status light without changing the real overlay behavior.

## What Changes

- Add a persisted setting for whether the settings page supports showing a traffic-light preview.
- Add a settings-page switch for enabling or disabling the preview.
- Show a local, static dynamic-island traffic-light preview only when the setting is enabled.
- Ensure the preview never changes the real overlay window state, Codex session state, polling, tray behavior, or hover/click expansion behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `top-island-overlay`: add configurable settings-page preview behavior for the island traffic light.

## Impact

- Affects overlay settings persistence and normalization.
- Affects the settings IPC state shape through the existing `OverlaySettings` contract.
- Affects the settings renderer UI.
- Adds tests for default setting behavior, persistence normalization, settings UI toggle behavior, and isolation from the real overlay state.
