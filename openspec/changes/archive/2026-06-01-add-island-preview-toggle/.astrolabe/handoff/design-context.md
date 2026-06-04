# Astrolabe Design Handoff

- Change: add-island-preview-toggle
- Phase: design
- Mode: compact
- Context hash: fb2573fc70320c8066b785b649e8cdf35d5da5562c790301da20f35aa599e845

Generated-by: ast-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/add-island-preview-toggle/proposal.md

- Source: openspec/changes/add-island-preview-toggle/proposal.md
- Lines: 1-27
- SHA256: 4cc05a0a36483289a6623826d1236158d9a369c104cdc11a38d69a5dd2333811

```md
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
```

## openspec/changes/add-island-preview-toggle/design.md

- Source: openspec/changes/add-island-preview-toggle/design.md
- Lines: 1-36
- SHA256: 4ac1ac4e5f9550ad7bf64b3a3645a36606e94f065243212296ee6a29c25201ed

```md
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
```

## openspec/changes/add-island-preview-toggle/tasks.md

- Source: openspec/changes/add-island-preview-toggle/tasks.md
- Lines: 1-6
- SHA256: 1af0166fe4e82cf0451365cb46e83bc4cac7c7366a9158314de3a061cbd0e4bb

```md
## Tasks

- [ ] Extend overlay settings with persisted traffic-light preview support.
- [ ] Add settings UI toggle and local preview rendering that does not affect live overlay state.
- [ ] Add regression tests for settings normalization, UI toggle behavior, and live-overlay isolation.
- [ ] Run focused and full verification.
```

## openspec/changes/add-island-preview-toggle/specs/top-island-overlay/spec.md

- Source: openspec/changes/add-island-preview-toggle/specs/top-island-overlay/spec.md
- Lines: 1-26
- SHA256: 6a2a7f379f97f6c894efd4e8e57ee23da1da4ddee0bbe4f384eced7088eac15a

```md
## MODIFIED Requirements

### Requirement: Overlay appearance can be adjusted
The system SHALL allow users to adjust overlay opacity, size, and settings-page traffic-light preview support within readable, bounded ranges.

#### Scenario: User changes opacity
- **WHEN** the user changes the opacity setting
- **THEN** the island updates its visible opacity and persists the setting after restart

#### Scenario: User changes size
- **WHEN** the user changes the island size setting
- **THEN** compact and expanded overlay bounds update proportionally and persist after restart

#### Scenario: User enables traffic-light preview support
- **WHEN** the user enables the traffic-light preview setting in the background settings page
- **THEN** the settings page shows a local dynamic-island traffic-light preview
- **AND** the preview does not change the real overlay window state or Codex session state

#### Scenario: User disables traffic-light preview support
- **WHEN** the user disables the traffic-light preview setting in the background settings page
- **THEN** the settings page hides or disables the local dynamic-island traffic-light preview
- **AND** the real overlay continues to behave according to the live Codex status

#### Scenario: Appearance values are bounded
- **WHEN** a saved or incoming opacity, size, or preview-support value is outside the supported range
- **THEN** the system clamps or rejects the value and keeps the island readable
```

