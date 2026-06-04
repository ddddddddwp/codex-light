# Astrolabe Design Handoff

- Change: support-multiple-cli-lights
- Phase: design
- Mode: compact
- Context hash: 386337799222e94515f3f1506f9838bae9f91a2eb821a34f60f9fb2e6b5f9a01

Generated-by: ast-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/support-multiple-cli-lights/proposal.md

- Source: openspec/changes/support-multiple-cli-lights/proposal.md
- Lines: 1-27
- SHA256: 143486f04302c9d81aa779286c1a7d203d124ca735c4ea222142700a545fb27d

```md
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
```

## openspec/changes/support-multiple-cli-lights/design.md

- Source: openspec/changes/support-multiple-cli-lights/design.md
- Lines: 1-34
- SHA256: 4495a1cc0b72de41730e837e449e07d1a1e21c0c320609d54e68437a86d6e0e3

```md
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
```

## openspec/changes/support-multiple-cli-lights/tasks.md

- Source: openspec/changes/support-multiple-cli-lights/tasks.md
- Lines: 1-22
- SHA256: 04e10599f45abf40d4ce8c23d7641f2c38c0e8f814aa963773714b1acdb85714

```md
## 1. Renderer Data Preparation

- [ ] Add a renderer helper that derives display sessions from `snapshot.sessions`, prioritizing active sessions, then most recently updated sessions, and capping output at 10.
- [ ] Ensure the empty state uses English visible copy: "No active sessions".

## 2. Compact Multi-Light UI

- [ ] Update compact island rendering to show one traffic-light indicator per displayed session.
- [ ] Preserve concise project/session context and count behavior without turning compact mode into a metadata panel.
- [ ] Add accessible labels or titles for individual session indicators.

## 3. Expanded Multi-Session Details

- [ ] Update expanded rendering to show details for every displayed session.
- [ ] Keep existing fallback behavior for missing action, model, cwd, elapsed, and source values.
- [ ] Ensure the expanded UI remains bounded and readable with 10 displayed sessions.

## 4. Verification

- [ ] Add or update renderer tests for no-session English copy, multiple compact lights, expanded multiple details, and the 10-session cap.
- [ ] Add or update visual coverage for empty, multi-session, and 10-session states.
- [ ] Run the relevant automated checks before marking the implementation complete.
```

## openspec/changes/support-multiple-cli-lights/specs/top-island-overlay/spec.md

- Source: openspec/changes/support-multiple-cli-lights/specs/top-island-overlay/spec.md
- Lines: 1-47
- SHA256: 7a3d28e811251cb277d8fa9073088a8a14e77f27d68489d693d6ec73255211b1

```md
## MODIFIED Requirements

### Requirement: Island uses clear status colors and labels
The system SHALL show distinct visual states for running, waiting, completed, error, and idle statuses while compact mode remains limited to traffic-light indicators, concise session context, and active-session count.

#### Scenario: Running state is green
- **WHEN** the global display state is `running`
- **THEN** the compact island shows green status styling for the island and green traffic-light indicators for running displayed sessions

#### Scenario: Waiting state is yellow
- **WHEN** the global display state is `waiting`
- **THEN** the compact island shows yellow status styling for the island and yellow traffic-light indicators for waiting displayed sessions

#### Scenario: Idle state is red with English copy
- **WHEN** there are no sessions to display
- **THEN** the compact island shows a red idle state and the label "No active sessions"
- **AND** the visible idle copy does not show Chinese text

#### Scenario: Completed or error state is red
- **WHEN** a displayed session state is `completed` or `error`
- **THEN** that session's traffic-light indicator is red

#### Scenario: Multiple active sessions are displayed as multiple lights
- **WHEN** more than one Codex CLI session exists
- **THEN** the compact island displays one traffic-light indicator per displayed session
- **AND** the compact island does not collapse those sessions into only one status light plus a count

#### Scenario: Multi-session display is capped
- **WHEN** more than 10 Codex CLI sessions exist
- **THEN** the compact island displays no more than 10 session traffic-light indicators
- **AND** the displayed sessions prioritize active sessions before inactive sessions

### Requirement: Island expands to show details
The system SHALL expand the island on hover or click to show details for the displayed sessions without opening a full dashboard window.

#### Scenario: Expanded island shows multiple session details
- **WHEN** the user hovers over or clicks the compact island and multiple sessions are displayed
- **THEN** the island expands to show a details item for each displayed session
- **AND** each item includes tool or action, model, cwd, elapsed time, session source, and session state when available

#### Scenario: Expanded island handles missing metadata
- **WHEN** a displayed session does not include tool, model, cwd, or timestamp values
- **THEN** the expanded island uses clear fallback labels without breaking layout

#### Scenario: Expanded island respects the display cap
- **WHEN** more than 10 Codex CLI sessions exist
- **THEN** the expanded island shows details for the same capped set of sessions shown by the compact island
```

