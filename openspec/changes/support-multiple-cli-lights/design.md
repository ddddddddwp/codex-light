## Overview

The change is primarily a renderer presentation update. Existing hook ingestion and normalization already preserve multiple sessions in `CodexLightSnapshot.sessions`; the overlay should consume that list directly and render a bounded set of session indicators.

## Decisions

- Render a display list derived from `snapshot.sessions`, capped at 10 sessions.
- Prefer active sessions over inactive sessions, then order by most recently updated so currently relevant CLI terminals remain visible.
- In compact mode, show a row of per-session traffic lights. Each light uses the session's own state color, and the island retains a concise label/count so the compact surface does not become a details panel.
- In expanded mode, render a details item for each displayed session instead of only `snapshot.sessions[0]`.
- Preserve the global island state class for overall shell coloring and compatibility, while per-session lights communicate individual CLI state.
- Use English no-session copy for the idle state, specifically "No active sessions".

## Data Flow

1. Hook events append to the runtime event log.
2. Normalization aggregates events into a `CodexLightSnapshot` containing `sessions[]`.
3. Snapshot sync publishes the latest snapshot to the renderer.
4. The renderer derives `displaySessions = sortSessions(snapshot.sessions).slice(0, 10)`.
5. Compact and expanded UI render from `displaySessions`.

## Edge Cases

- If no sessions exist, compact and expanded states show "No active sessions".
- If more than 10 sessions exist, only the 10 highest-priority sessions render; the active count remains available for summary text.
- Missing model, cwd, action, or timestamp values continue to use existing fallback labels.
- A mix of waiting/running/completed sessions should show each session's own light color while the island's global state still reflects aggregate priority.

## Testing

- Unit or component tests for session sorting and capping behavior.
- Renderer tests for compact multi-light output with multiple CLI sessions.
- Renderer tests for expanded details showing multiple sessions.
- Visual tests for the empty state, a few sessions, and the 10-session cap.
