## Why

Codex CLI and the Windows desktop app can run long tasks, pause for approvals, or finish while the user is focused elsewhere. A Win11 top-of-screen "dynamic island" monitor gives immediate status visibility without requiring the user to keep the terminal or desktop app in front.

## What Changes

- Add a Windows-first Electron + React application named Codex Light.
- Add a topmost, frameless, transparent, expandable island overlay at the top center of the primary display.
- Add a local status model that aggregates Codex hook events into clear states: running, waiting for approval, completed, error, and idle.
- Add a hook command that Codex lifecycle hooks can call on Windows to update the local status file.
- Add desktop app fallback monitoring: first use the same hook/status path when available, otherwise show process presence and recent activity.
- Add installation and diagnostics commands for Codex hook setup, state-file permissions, and runtime health.
- Add tests and visual verification for the state model, hook ingestion, and island UI states.

## Capabilities

### New Capabilities

- `codex-status-ingestion`: Capture Codex CLI and desktop status through hooks, local state files, and desktop fallback signals.
- `top-island-overlay`: Present Codex status in a Win11 top-center expandable island with clear visual states.
- `win11-app-operations`: Provide Windows installation, hook setup, diagnostics, tray behavior, and developer verification workflows.

### Modified Capabilities

- None.

## Impact

- Introduces a new Electron + React + TypeScript codebase in this repository.
- Adds Node-based CLI entry points for hook ingestion, installation, and diagnostics.
- Writes runtime state under `%LOCALAPPDATA%/CodexLight/` on Windows, with development fallbacks for non-Windows test environments.
- Reads and updates Codex hook configuration under the user's Codex config directory when the user runs hook installation.
- Uses current Codex lifecycle hooks as documented by OpenAI and Electron transparent/frameless window APIs as documented by Electron.
