## MODIFIED Requirements

### Requirement: Normalize hook events into display states

The system SHALL map Codex hook and fallback events into normalized session states suitable for UI display.

#### Scenario: Session start becomes red idle

- **WHEN** a `SessionStart` hook event is recorded for a session
- **THEN** the normalized session state becomes `idle`

#### Scenario: User prompt becomes green running

- **WHEN** a `UserPromptSubmit` hook event is recorded for a session
- **THEN** the normalized session state becomes `running`

#### Scenario: Permission-gated tool start becomes yellow waiting

- **WHEN** a permission-gated `PreToolUse` hook event is recorded for a session
- **THEN** the normalized session state becomes `waiting`

#### Scenario: Permission-gated tool completion becomes green running

- **WHEN** a permission-gated `PostToolUse` hook event is recorded for a session
- **THEN** the normalized session state becomes `running`

#### Scenario: Permission request becomes waiting

- **WHEN** a `PermissionRequest` hook event is recorded for a session
- **THEN** the normalized session state becomes `waiting`

#### Scenario: Stop becomes red completed

- **WHEN** a `Stop` hook event is recorded for a session
- **THEN** the normalized session state becomes `completed`
