## Purpose

Define the desktop top-island overlay presentation, positioning, status states, expansion behavior, and appearance controls.

## Requirements

### Requirement: Top island appears at the top center of the primary display
The system SHALL render a frameless, transparent, topmost overlay window containing a compact island at the configured top position of the selected Win11 display, defaulting to the top center of the primary display.

#### Scenario: App starts with compact island
- **WHEN** the desktop app launches with no saved overlay position setting
- **THEN** a compact island appears near the top center of the primary display without a native title bar

#### Scenario: User selects top alignment
- **WHEN** the user selects top center, top left, or top right alignment
- **THEN** the overlay moves to that top position on the selected display and keeps that position after restart

#### Scenario: User selects target display
- **WHEN** multiple displays are available and the user selects a target display
- **THEN** the overlay appears on that display using the selected top alignment

#### Scenario: Selected display is unavailable
- **WHEN** the saved target display is not available at app startup or after display changes
- **THEN** the overlay appears on the primary display without deleting the saved display preference

#### Scenario: Overlay remains above normal windows
- **WHEN** a normal application window receives focus
- **THEN** the island remains visible above that normal window

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

#### Scenario: Expanded island collapses
- **WHEN** the pointer leaves the island or the user clicks outside according to the UI interaction model
- **THEN** the island returns to compact size

### Requirement: Overlay avoids blocking normal desktop use
The system SHALL avoid blocking clicks outside the visible island controls.

#### Scenario: Transparent area does not consume normal clicks
- **WHEN** the user clicks outside the visible island body in the transparent overlay area
- **THEN** the click reaches the underlying desktop or application where the platform allows it

### Requirement: Overlay appearance can be adjusted
The system SHALL allow users to adjust overlay opacity, size, and traffic-light preview support within readable, bounded ranges.

#### Scenario: User changes opacity
- **WHEN** the user changes the opacity setting
- **THEN** the island updates its visible opacity and persists the setting after restart

#### Scenario: User changes size
- **WHEN** the user changes the island size setting
- **THEN** compact and expanded overlay bounds update proportionally and persist after restart

#### Scenario: User enables traffic-light preview support
- **WHEN** the user enables the traffic-light preview setting in the background settings page
- **THEN** hovering or clicking the island can expand it to show session details
- **AND** the settings page shows a local dynamic-island traffic-light preview
- **AND** the preview does not change the real overlay window state or Codex session state

#### Scenario: User disables traffic-light preview support
- **WHEN** the user disables the traffic-light preview setting in the background settings page
- **THEN** hovering or clicking the island keeps it compact and does not show the expanded preview
- **AND** the settings page hides or disables the local dynamic-island traffic-light preview
- **AND** the real overlay continues to behave according to the live Codex status

#### Scenario: Appearance values are bounded
- **WHEN** a saved or incoming opacity, size, or preview-support value is outside the supported range
- **THEN** the system clamps or rejects the value and keeps the island readable
