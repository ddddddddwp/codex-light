## Why

Codex Light's current status contract does not match the requested traffic-light behavior for hook events. In particular, permission-gated `PreToolUse` events need to show a yellow waiting state, while session start and stop states must stay red through the existing idle/completed display states.

## What Changes

- Map `SessionStart` to the red idle state.
- Map `UserPromptSubmit` to the green running state.
- Map permission-gated `PreToolUse` events to the yellow waiting state.
- Map permission-gated `PostToolUse` events to the green running state.
- Map `Stop` to the red completed state.
- Keep `PermissionRequest` as a yellow compatibility path.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `codex-status-ingestion`: tighten the hook-event-to-display-state mapping requirements.
- `top-island-overlay`: explicitly include idle as a red status-light state.

## Impact

- Affected code: hook payload normalization in `src/core/normalize.ts`.
- Affected tests: normalization tests for hook event mapping.
- Affected specs: Codex status ingestion and top-island overlay display-state requirements.
