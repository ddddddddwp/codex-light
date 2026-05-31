## 0. Stability Gate

- [ ] 0.1 Confirm status accuracy/stability work is complete enough to start UI implementation.
- [ ] 0.2 Re-run baseline `npm run typecheck`, `npm test`, and `npm run lint` before touching UI behavior.

## 1. Settings Model and IPC

- [ ] 1.1 Add a typed overlay settings model with defaults matching current behavior.
- [ ] 1.2 Add main-process persistence under the Electron user data directory.
- [ ] 1.3 Add validation/clamping for position, display target, opacity, and size settings.
- [ ] 1.4 Extend preload and IPC types for reading settings, updating settings, listing displays, and reading startup status.

## 2. Overlay Window Positioning

- [ ] 2.1 Extract a pure bounds calculation helper for compact and expanded overlay sizes.
- [ ] 2.2 Support top center, top left, and top right alignment.
- [ ] 2.3 Support selected display targeting with fallback to primary display when unavailable.
- [ ] 2.4 Apply opacity and size settings to the BrowserWindow and renderer shell.
- [ ] 2.5 Reposition the overlay when expansion state, settings, or display topology changes.

## 3. Island Presentation

- [ ] 3.1 Update compact mode to show only status light, project name or idle fallback label, and active-session count.
- [ ] 3.2 Update expanded mode to show tool/action, model, cwd, elapsed time, source, and active-session count.
- [ ] 3.3 Add elapsed-time formatting that updates while expanded without changing stored snapshots.
- [ ] 3.4 Ensure missing metadata uses stable fallback labels and does not break layout.

## 4. Settings Surface

- [ ] 4.1 Add a tray entry that opens the settings surface.
- [ ] 4.2 Implement controls for alignment, display, opacity, size, and startup.
- [ ] 4.3 Apply setting changes immediately to the existing overlay.
- [ ] 4.4 Keep the settings surface separate from the compact/expanded island UI.

## 5. Startup Preference

- [ ] 5.1 Add an app-level startup adapter for reading and writing Windows login startup state.
- [ ] 5.2 Connect the startup toggle to the settings surface.
- [ ] 5.3 Handle dev, unpackaged, and installed build differences without crashing.

## 6. Verification

- [ ] 6.1 Add unit tests for settings defaults, validation, persistence, and migration.
- [ ] 6.2 Add unit tests for overlay bounds across alignments and displays.
- [ ] 6.3 Add renderer tests for compact and expanded metadata visibility.
- [ ] 6.4 Add or update visual checks for compact/expanded island states and settings-safe layout.
- [ ] 6.5 Run `npm run typecheck`, `npm test`, and `npm run lint`.
