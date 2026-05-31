## ADDED Requirements

### Requirement: Hook command records Codex lifecycle events

The system SHALL provide a hook command that accepts one Codex hook JSON object on stdin and records it under the local Codex Light runtime directory.

#### Scenario: Record valid hook input

- **WHEN** the hook command receives a valid Codex hook payload containing `hook_event_name`, `session_id`, `cwd`, and `model`
- **THEN** the system writes an event record and updates the current status snapshot atomically

#### Scenario: Reject malformed hook input

- **WHEN** the hook command receives invalid JSON or a payload without a hook event name
- **THEN** the system exits non-zero and records a diagnostic error without corrupting the current status snapshot

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

### Requirement: Aggregate multiple Codex sessions

The system SHALL aggregate multiple sessions into one global display state for the island.

#### Scenario: Waiting has highest visible priority

- **WHEN** at least one active session is waiting and another active session is running
- **THEN** the global display state is `waiting` and the expanded details list both sessions

#### Scenario: Active sessions include a count

- **WHEN** more than one non-idle session exists
- **THEN** the compact island displays the number of sessions

### Requirement: Desktop fallback reports degraded status

The system SHALL report Codex desktop app status as degraded when hook-based desktop events are unavailable.

#### Scenario: Desktop process is present without hook activity

- **WHEN** the desktop process detector finds a Codex desktop process and no recent desktop hook event exists
- **THEN** the system records a desktop fallback status with source `desktop-fallback`

#### Scenario: Desktop fallback is visible in details

- **WHEN** the renderer displays an expanded desktop fallback session
- **THEN** the details identify the status as process or recent-activity based rather than hook-precise
