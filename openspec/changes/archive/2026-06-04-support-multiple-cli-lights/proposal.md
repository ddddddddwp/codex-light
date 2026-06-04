## Why

Codex Light already ingests multiple Codex CLI sessions, but the top island display still presents only one primary session with a count badge. Users running several Codex CLI terminals need the visible traffic-light presentation to represent each active CLI session directly.

## What Changes

- Show multiple session traffic lights in the top island instead of collapsing all sessions into one primary light.
- Support displaying up to 10 Codex CLI sessions at once.
- Keep the compact island readable by using per-session lights and concise labels/counts rather than verbose metadata.
- Expand the island to show details for the displayed sessions, not only the first session.
- Use English idle copy such as "No active sessions" for the no-session state; the visible idle state must not show Chinese text.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `top-island-overlay`: change compact and expanded rendering so the overlay can display multiple Codex CLI session lights, up to 10 sessions, with English idle copy.

## Impact

- Renderer UI: `src/renderer/App.tsx`, `src/renderer/styles.css`, and visual rendering tests.
- Existing snapshot data shape remains usable because `CodexLightSnapshot.sessions` already contains multiple sessions.
- Tests should cover compact multi-light rendering, expanded multi-session details, the 10-session display cap, and the English no-session label.
