## 0. Stability Gate

- [x] 0.1 Confirm status accuracy/stability work is complete enough to start UI implementation.
- [x] 0.2 Re-run baseline `npm run typecheck`, `npm test`, and `npm run lint` before touching UI behavior.

## 1. Settings Model and IPC

- [x] 1.1 Add a typed overlay settings model with defaults matching current behavior.
- [x] 1.2 Add main-process persistence under the Electron user data directory.
- [x] 1.3 Add validation/clamping for position, display target, opacity, and size settings.
- [x] 1.4 Extend preload and IPC types for reading settings, updating settings, listing displays, and reading startup status.

## 2. Overlay Window Positioning

- [x] 2.1 Extract a pure bounds calculation helper for compact and expanded overlay sizes.
- [x] 2.2 Support top center, top left, and top right alignment.
- [x] 2.3 Support selected display targeting with fallback to primary display when unavailable.
- [x] 2.4 Apply opacity and size settings to the BrowserWindow and renderer shell.
- [x] 2.5 Reposition the overlay when expansion state, settings, or display topology changes.

## 3. Island Presentation

- [x] 3.1 Update compact mode to show only status light, project name or idle fallback label, and active-session count.
- [x] 3.2 Update expanded mode to show tool/action, model, cwd, elapsed time, source, and active-session count.
- [x] 3.3 Add elapsed-time formatting that updates while expanded without changing stored snapshots.
- [x] 3.4 Ensure missing metadata uses stable fallback labels and does not break layout.

## 4. Settings Surface

- [x] 4.1 Add a tray entry that opens the settings surface.
- [x] 4.2 Implement controls for alignment, display, opacity, size, and startup.
- [x] 4.3 Apply setting changes immediately to the existing overlay.
- [x] 4.4 Keep the settings surface separate from the compact/expanded island UI.

## 5. Startup Preference

- [x] 5.1 Add an app-level startup adapter for reading and writing Windows login startup state.
- [x] 5.2 Connect the startup toggle to the settings surface.
- [x] 5.3 Handle dev, unpackaged, and installed build differences without crashing.

## 6. Verification

- [x] 6.1 Add unit tests for settings defaults, validation, persistence, and migration.
- [x] 6.2 Add unit tests for overlay bounds across alignments and displays.
- [x] 6.3 Add renderer tests for compact and expanded metadata visibility.
- [x] 6.4 Add or update visual checks for compact/expanded island states and settings-safe layout.
- [x] 6.5 Run `npm run typecheck`, `npm test`, and `npm run lint`.
