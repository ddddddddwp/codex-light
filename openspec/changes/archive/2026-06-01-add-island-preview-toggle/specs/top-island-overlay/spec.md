## MODIFIED Requirements

### Requirement: Overlay appearance can be adjusted
The system SHALL allow users to adjust overlay opacity, size, and settings-page traffic-light preview support within readable, bounded ranges.

#### Scenario: User changes opacity
- **WHEN** the user changes the opacity setting
- **THEN** the island updates its visible opacity and persists the setting after restart

#### Scenario: User changes size
- **WHEN** the user changes the island size setting
- **THEN** compact and expanded overlay bounds update proportionally and persist after restart

#### Scenario: User enables traffic-light preview support
- **WHEN** the user enables the traffic-light preview setting in the background settings page
- **THEN** the settings page shows a local dynamic-island traffic-light preview
- **AND** the preview does not change the real overlay window state or Codex session state

#### Scenario: User disables traffic-light preview support
- **WHEN** the user disables the traffic-light preview setting in the background settings page
- **THEN** the settings page hides or disables the local dynamic-island traffic-light preview
- **AND** the real overlay continues to behave according to the live Codex status

#### Scenario: Appearance values are bounded
- **WHEN** a saved or incoming opacity, size, or preview-support value is outside the supported range
- **THEN** the system clamps or rejects the value and keeps the island readable
