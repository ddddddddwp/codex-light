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
The system SHALL show distinct visual states for running, waiting, completed, error, and idle statuses while compact mode remains limited to status light, project name, and active-session count.

#### Scenario: Running state is green
- **WHEN** the global display state is `running`
- **THEN** the compact island shows a green status light and the current project name when available

#### Scenario: Waiting state is yellow
- **WHEN** the global display state is `waiting`
- **THEN** the compact island shows a yellow status light and the current project name when available

#### Scenario: Idle state is red
- **WHEN** the global display state is `idle`
- **THEN** the compact island shows a red status light and an idle fallback label

#### Scenario: Completed or error state is red
- **WHEN** the global display state is `completed` or `error`
- **THEN** the compact island shows a red status light and the current project name when available

#### Scenario: Multiple active sessions are indicated
- **WHEN** more than one active session exists
- **THEN** the compact island shows the active session count without adding extra metadata text

### Requirement: Island expands to show details
The system SHALL expand the island on hover or click to show session details without opening a full dashboard window.

#### Scenario: Expanded island shows session metadata
- **WHEN** the user hovers over or clicks the compact island and at least one session exists
- **THEN** the island expands to show tool or action, model, cwd, elapsed time, session source, and active session count when available

#### Scenario: Expanded island handles missing metadata
- **WHEN** a session does not include tool, model, cwd, or timestamp values
- **THEN** the expanded island uses clear fallback labels without breaking layout

#### Scenario: Expanded island collapses
- **WHEN** the pointer leaves the island or the user clicks outside according to the UI interaction model
- **THEN** the island returns to compact size

### Requirement: Overlay avoids blocking normal desktop use
The system SHALL avoid blocking clicks outside the visible island controls.

#### Scenario: Transparent area does not consume normal clicks
- **WHEN** the user clicks outside the visible island body in the transparent overlay area
- **THEN** the click reaches the underlying desktop or application where the platform allows it

### Requirement: Overlay appearance can be adjusted
The system SHALL allow users to adjust overlay opacity and size within readable, bounded ranges.

#### Scenario: User changes opacity
- **WHEN** the user changes the opacity setting
- **THEN** the island updates its visible opacity and persists the setting after restart

#### Scenario: User changes size
- **WHEN** the user changes the island size setting
- **THEN** compact and expanded overlay bounds update proportionally and persist after restart

#### Scenario: Appearance values are bounded
- **WHEN** a saved or incoming opacity or size value is outside the supported range
- **THEN** the system clamps or rejects the value and keeps the island readable
