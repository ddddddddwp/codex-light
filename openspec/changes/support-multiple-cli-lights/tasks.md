## 1. Renderer Data Preparation

- [x] Add a renderer helper that derives display sessions from `snapshot.sessions`, prioritizing active sessions, then most recently updated sessions, and capping output at 10.
- [x] Ensure the empty state uses English visible copy: "No active sessions".

## 2. Compact Multi-Light UI

- [x] Update compact island rendering to show one traffic-light indicator per displayed session.
- [x] Preserve concise project/session context and count behavior without turning compact mode into a metadata panel.
- [x] Add accessible labels or titles for individual session indicators.

## 3. Expanded Multi-Session Details

- [x] Update expanded rendering to show details for every displayed session.
- [x] Keep existing fallback behavior for missing action, model, cwd, elapsed, and source values.
- [x] Ensure the expanded UI remains bounded and readable with 10 displayed sessions.

## 4. Verification

- [x] Add or update renderer tests for no-session English copy, multiple compact lights, expanded multiple details, and the 10-session cap.
- [x] Add or update visual coverage for empty, multi-session, and 10-session states.
- [x] Run the relevant automated checks before marking the implementation complete.
