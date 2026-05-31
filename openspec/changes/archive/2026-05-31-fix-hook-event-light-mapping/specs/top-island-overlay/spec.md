## MODIFIED Requirements

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
