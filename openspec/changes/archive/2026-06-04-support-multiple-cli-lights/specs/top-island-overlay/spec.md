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
