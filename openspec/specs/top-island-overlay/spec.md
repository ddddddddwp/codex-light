## ADDED Requirements

### Requirement: Top island appears at the top center of the primary display

The system SHALL render a frameless, transparent, topmost overlay window containing a compact island at the top center of the primary Win11 display.

#### Scenario: App starts with compact island

- **WHEN** the desktop app launches
- **THEN** a compact island appears near the top center of the primary display without a native title bar

#### Scenario: Overlay remains above normal windows

- **WHEN** a normal application window receives focus
- **THEN** the island remains visible above that normal window

### Requirement: Island uses clear status colors and labels

The system SHALL show distinct visual states for running, waiting, completed, error, and idle statuses.

#### Scenario: Running state is green

- **WHEN** the global display state is `running`
- **THEN** the compact island shows a green status light and running label

#### Scenario: Waiting state is yellow

- **WHEN** the global display state is `waiting`
- **THEN** the compact island shows a yellow status light and waiting label

#### Scenario: Idle state is red

- **WHEN** the global display state is `idle`
- **THEN** the compact island shows a red status light and idle label

#### Scenario: Completed or error state is red

- **WHEN** the global display state is `completed` or `error`
- **THEN** the compact island shows a red status light and an appropriate completion or error label

### Requirement: Island expands to show details

The system SHALL expand the island on hover or click to show session details without opening a full dashboard window.

#### Scenario: Expanded island shows session metadata

- **WHEN** the user hovers over or clicks the compact island
- **THEN** the island expands to show source, project or cwd, model, current action, elapsed time, and active session count when available

#### Scenario: Expanded island collapses

- **WHEN** the pointer leaves the island or the user clicks outside according to the UI interaction model
- **THEN** the island returns to compact size

### Requirement: Overlay avoids blocking normal desktop use

The system SHALL avoid blocking clicks outside the visible island controls.

#### Scenario: Transparent area does not consume normal clicks

- **WHEN** the user clicks outside the visible island body in the transparent overlay area
- **THEN** the click reaches the underlying desktop or application where the platform allows it
