## 1. Project Foundation

- [x] 1.1 Initialize an Electron + React + TypeScript workspace with package scripts for dev, build, test, lint, and typecheck
- [x] 1.2 Add shared directory structure for Electron main, renderer, hook CLI, core state logic, assets, tests, and documentation
- [x] 1.3 Configure formatting, linting, TypeScript project references, and test runner
- [x] 1.4 Add Windows runtime path helpers with non-Windows development fallbacks

## 2. Core Status Model

- [x] 2.1 Define normalized Codex event, session, source, and display-state types
- [x] 2.2 Implement hook payload parsing and validation
- [x] 2.3 Implement event-to-session normalization for running, waiting, completed, error, and idle states
- [x] 2.4 Implement multi-session aggregation with waiting priority and active session counts
- [x] 2.5 Add fixture-based unit tests for supported hook events and fallback events

## 3. Hook CLI And State Storage

- [x] 3.1 Implement the hook command that reads one JSON payload from stdin
- [x] 3.2 Implement append-only event log writing and atomic snapshot updates
- [x] 3.3 Implement error diagnostics for malformed input and write failures
- [x] 3.4 Add command-line fixtures or scripts to simulate hook events during development
- [x] 3.5 Add integration tests for CLI input, state file output, and malformed payload behavior

## 4. Electron Main Process

- [x] 4.1 Create the transparent frameless topmost BrowserWindow for the island overlay
- [x] 4.2 Implement primary-display positioning and compact/expanded window sizing
- [x] 4.3 Watch the status snapshot and forward normalized state to the renderer through IPC
- [x] 4.4 Add tray menu controls for show, hide, diagnostics, reload, and quit
- [x] 4.5 Add desktop fallback process/recent-activity detection

## 5. Renderer UI

- [x] 5.1 Build the compact top island with status light, label, and session count
- [x] 5.2 Build expanded island details with source, project/cwd, model, action, elapsed time, and fallback indicators
- [x] 5.3 Add polished transitions for compact-to-expanded state changes
- [x] 5.4 Add state-specific visuals for running, waiting, completed, error, and idle
- [x] 5.5 Verify transparent-area click behavior and adjust window sizing or pointer handling

## 6. Installation And Diagnostics

- [x] 6.1 Implement `install-hooks` with backup, idempotent update, and Windows command support
- [x] 6.2 Implement `doctor` checks for Codex config, hook executable path, runtime directory, state file, and desktop fallback status
- [x] 6.3 Document manual hook config snippets for users who do not want automatic edits
- [x] 6.4 Add tests for idempotent hook installation against temp config files

## 7. Verification And Packaging

- [x] 7.1 Add Playwright or Electron-based screenshot checks for compact and expanded island states
- [x] 7.2 Run unit, integration, lint, typecheck, and build verification
- [x] 7.3 Add a development README with Win11 setup, Codex hook setup, and troubleshooting
- [x] 7.4 Configure Windows packaging metadata and verify the app can be launched locally
