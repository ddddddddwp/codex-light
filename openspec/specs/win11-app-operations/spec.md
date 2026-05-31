## Purpose

Define Windows app operations for hook installation, diagnostics, tray controls, overlay settings, startup behavior, and verification.

## Requirements

### Requirement: App provides hook installation
The system SHALL provide a command that installs Codex Light hooks into the user's Codex configuration idempotently on Windows.

#### Scenario: Install hooks first time
- **WHEN** the user runs the hook installation command and no Codex Light hook block exists
- **THEN** the system backs up the target config and adds hook handlers that invoke the Codex Light hook command

#### Scenario: Install hooks repeatedly
- **WHEN** the user runs the hook installation command after hooks are already installed
- **THEN** the system leaves a single Codex Light hook block and reports that installation is already current

### Requirement: App provides diagnostics
The system SHALL provide a doctor command that checks runtime health and reports actionable failures.

#### Scenario: Doctor checks state path
- **WHEN** the user runs the doctor command
- **THEN** the system verifies the runtime directory is writable and reports the state file path

#### Scenario: Doctor checks Codex hook config
- **WHEN** the user runs the doctor command
- **THEN** the system reports whether Codex Light hooks are installed and whether the hook executable path exists

### Requirement: App supports tray controls
The system SHALL provide a Win11 tray entry for common controls.

#### Scenario: Tray menu toggles overlay visibility
- **WHEN** the user selects the tray option to hide or show the island
- **THEN** the overlay visibility changes without stopping hook ingestion

#### Scenario: Tray menu opens diagnostics
- **WHEN** the user selects diagnostics from the tray menu
- **THEN** the app opens or displays diagnostic status for hook installation and runtime state

### Requirement: App provides UI settings controls
The system SHALL provide a settings surface for overlay presentation preferences that opens from the app's background controls instead of the compact island.

#### Scenario: Tray menu opens settings
- **WHEN** the user selects the settings option from the tray menu
- **THEN** the app opens a settings surface without stopping hook ingestion or hiding the status island

#### Scenario: Settings show current overlay preferences
- **WHEN** the settings surface opens
- **THEN** it shows the current position, display, opacity, size, and startup preferences

#### Scenario: Settings changes apply immediately
- **WHEN** the user changes an overlay presentation setting
- **THEN** the app applies the setting to the active overlay and persists it for future launches

### Requirement: App supports startup preference control
The system SHALL allow users to inspect and change whether Codex Light starts automatically after Windows login.

#### Scenario: User enables startup
- **WHEN** the user enables the startup setting
- **THEN** the app configures Codex Light to start after Windows login and reports the enabled state

#### Scenario: User disables startup
- **WHEN** the user disables the startup setting
- **THEN** the app removes Codex Light from Windows login startup and reports the disabled state

#### Scenario: Startup state is read on launch
- **WHEN** the app starts
- **THEN** the settings surface reports the current startup state from the app-level startup mechanism

### Requirement: Development workflow verifies behavior
The system SHALL include automated checks for core state behavior, hook ingestion, and UI rendering.

#### Scenario: Tests cover state normalization
- **WHEN** the test suite runs
- **THEN** fixture-based tests verify hook payload normalization and aggregate priority rules

#### Scenario: Visual checks cover island states
- **WHEN** visual verification runs
- **THEN** screenshots confirm the compact and expanded island render nonblank, correctly positioned, and visually distinct across key states
