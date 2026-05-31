## ADDED Requirements

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
