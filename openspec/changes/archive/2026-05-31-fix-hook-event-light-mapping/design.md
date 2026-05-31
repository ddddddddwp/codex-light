## Context

The renderer already uses red for `idle`, `completed`, and `error`, green for `running`, and yellow for `waiting`. The required fix is therefore in hook normalization: map Codex hook payloads to the correct normalized state before snapshots are written.

## Decision

Use the existing state model:

- `SessionStart` -> `idle` -> red
- `UserPromptSubmit` -> `running` -> green
- permission-gated `PreToolUse` -> `waiting` -> yellow
- permission-gated `PostToolUse` -> `running` -> green
- `Stop` -> `completed` -> red

`PermissionRequest` remains mapped to `waiting` because older or alternate Codex hook payloads may still emit it.

Permission-gated `PreToolUse` detection uses explicit approval/permission flags when present and falls back to known tool names that commonly require confirmation, such as `Bash`, `Edit`, `Write`, `MultiEdit`, and equivalent Codex tool names.

## Risks

- Codex hook payload fields may differ across CLI versions. The fallback known-tool list keeps current WSL testing useful while explicit boolean flags allow newer payloads to be precise.
- Mapping every `PreToolUse` to waiting would overstate non-permission tools, so the implementation only treats permission-gated tools as yellow.
