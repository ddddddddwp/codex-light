---
change: support-multiple-cli-lights
design-doc: docs/superpowers/specs/2026-06-04-support-multiple-cli-lights-design.md
base-ref: 47a9b68e1d0a8ae5c05e733fb56fd8121f70d077
archived-with: 2026-06-04-support-multiple-cli-lights
---

# Multiple CLI Traffic Lights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current dirty worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render up to 10 Codex CLI sessions as individual traffic lights in the top island, with matching expanded details and English empty-state copy.

**Architecture:** Keep ingestion and snapshot types unchanged. Add a renderer-only display-session derivation helper in `src/renderer/App.tsx`, use it for compact and expanded rendering, and update CSS/tests around the new per-session light group.

**Tech Stack:** React 19, TypeScript, CSS, Vitest + Testing Library, Playwright visual tests.

## Worktree Rules

The repository already has dirty changes outside this change. Continue in the current worktree and preserve existing edits in:

- `package.json`
- `src/core/normalize.ts`
- `src/hook-cli/index.ts`
- `src/renderer/styles.css`
- `tests/core/normalize.test.ts`
- `tests/hook-cli/hook-cli.test.ts`
- `tests/visual/island.spec.ts`
- `tests/packaging/electron-builder-config.test.ts`

Do not revert or reformat unrelated dirty files. For `src/renderer/styles.css` and `tests/visual/island.spec.ts`, apply incremental edits on top of the existing dirty changes.

## File Structure

- Modify `src/renderer/App.tsx`
  - Add `MAX_DISPLAY_SESSIONS`, display-session sorting helpers, state label helpers, and per-session rendering.
  - Replace `primary = snapshot.sessions[0]` usage with derived `displaySessions` and `primary = displaySessions[0]`.

- Modify `src/renderer/styles.css`
  - Preserve existing attention animation changes.
  - Add `.status-lights`, `.session-light`, and per-state styling that works for both `.status-dot` and new session lights.
  - Add bounded expanded list styles for up to 10 sessions.

- Modify `tests/renderer/App.test.tsx`
  - Update tests that currently expect only one primary expanded session.
  - Add empty-state English copy, multi-light, expanded multi-session, and 10-session cap coverage.

- Modify `src/renderer/demo-snapshot.ts`
  - Add `demoState=multi` support for Playwright visual coverage.

- Modify `tests/visual/island.spec.ts`
  - Update selectors from `.status-dot` to support `.session-light` where appropriate.
  - Add visual assertions for multi-session and 10-session rendering.

- Modify `openspec/changes/support-multiple-cli-lights/tasks.md`
  - Check off tasks after implementation and verification.

## Task 1: Add Display-Session Derivation Tests

**Files:**
- Modify: `tests/renderer/App.test.tsx`

- [ ] **Step 1: Replace the old single-primary multi-session test expectation**

Change the current test named `renders only the primary session in expanded preview while keeping the total count` so it expects all displayed sessions to render:

```tsx
it('renders expanded details for displayed sessions while keeping the total count', () => {
  render(
    <App
      initialSnapshot={{
        ...snapshot,
        activeSessionCount: 3,
        sessions: [
          snapshot.sessions[0],
          {
            ...snapshot.sessions[0],
            sessionId: 'session-2',
            projectName: 'other-project',
            cwd: 'C:\\code\\other',
            action: 'Running Python'
          },
          {
            ...snapshot.sessions[0],
            sessionId: 'session-3',
            projectName: 'third-project',
            cwd: 'C:\\code\\third',
            action: 'Reading files'
          }
        ]
      }}
      initialExpanded
      initialNow={new Date('2026-05-31T00:00:05.000Z')}
    />
  );

  expect(screen.getByText('Waiting for approval: Bash')).toBeInTheDocument();
  expect(screen.getByText('Running Python')).toBeInTheDocument();
  expect(screen.getByText('Reading files')).toBeInTheDocument();
  expect(screen.getByText('C:\\code\\other')).toBeInTheDocument();
  expect(screen.getByText('3 个会话')).toBeInTheDocument();
});
```

- [ ] **Step 2: Update the idle fallback test to English**

Change `renders localized idle fallback` to:

```tsx
it('renders English idle fallback when there are no sessions', () => {
  render(
    <App
      initialSnapshot={{
        ...snapshot,
        globalState: 'idle',
        activeSessionCount: 0,
        sessions: []
      }}
      initialExpanded
    />
  );

  expect(screen.getAllByText('No active sessions')).toHaveLength(2);
  expect(screen.queryByText('暂无活动会话')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add compact multi-light and cap tests**

Append tests:

```tsx
it('renders one compact traffic light per displayed session', () => {
  render(
    <App
      initialSnapshot={{
        ...snapshot,
        activeSessionCount: 3,
        sessions: [
          snapshot.sessions[0],
          { ...snapshot.sessions[0], sessionId: 'running-session', state: 'running', projectName: 'runner' },
          { ...snapshot.sessions[0], sessionId: 'completed-session', state: 'completed', projectName: 'done' }
        ]
      }}
      initialExpanded={false}
    />
  );

  expect(screen.getAllByTestId('session-light')).toHaveLength(3);
  expect(screen.getByTitle('demo: waiting')).toBeInTheDocument();
  expect(screen.getByTitle('runner: running')).toBeInTheDocument();
  expect(screen.getByTitle('done: completed')).toBeInTheDocument();
});

it('caps displayed traffic lights at 10 and prioritizes active recent sessions', () => {
  const sessions = Array.from({ length: 12 }, (_, index) => ({
    ...snapshot.sessions[0],
    sessionId: `session-${index}`,
    projectName: `project-${index}`,
    state: index === 0 ? 'idle' as const : 'running' as const,
    updatedAt: `2026-05-31T00:00:${String(index).padStart(2, '0')}.000Z`
  }));

  render(
    <App
      initialSnapshot={{
        ...snapshot,
        activeSessionCount: 11,
        sessions
      }}
      initialExpanded
      initialNow={new Date('2026-05-31T00:00:20.000Z')}
    />
  );

  expect(screen.getAllByTestId('session-light')).toHaveLength(10);
  expect(screen.queryByText('project-0')).not.toBeInTheDocument();
  expect(screen.getByText('project-11')).toBeInTheDocument();
});
```

- [ ] **Step 4: Run focused renderer test and verify failure before implementation**

Run:

```bash
npm test -- tests/renderer/App.test.tsx
```

Expected before implementation: tests fail because `session-light` does not exist, idle copy is still localized, and expanded rendering only shows the primary session.

## Task 2: Implement Renderer Multi-Session Rendering

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Add display constants and helpers**

Add below `EMPTY`:

```tsx
const MAX_DISPLAY_SESSIONS = 10;
const ALWAYS_ENGLISH_IDLE = 'No active sessions';
const STATE_WEIGHT: Record<CodexSession['state'], number> = {
  waiting: 5,
  running: 4,
  error: 3,
  completed: 2,
  idle: 1
};
```

Add helpers near `formatElapsed`:

```tsx
function getDisplaySessions(sessions: CodexSession[]): CodexSession[] {
  return [...sessions].sort(compareDisplaySessions).slice(0, MAX_DISPLAY_SESSIONS);
}

function compareDisplaySessions(a: CodexSession, b: CodexSession): number {
  const aActive = isActiveSession(a) ? 1 : 0;
  const bActive = isActiveSession(b) ? 1 : 0;
  if (aActive !== bActive) return bActive - aActive;

  const stateDiff = STATE_WEIGHT[b.state] - STATE_WEIGHT[a.state];
  if (stateDiff !== 0) return stateDiff;

  const updatedDiff = timestampForSort(b.updatedAt) - timestampForSort(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return a.sessionId.localeCompare(b.sessionId);
}

function isActiveSession(session: CodexSession): boolean {
  return session.state !== 'idle';
}

function timestampForSort(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sessionDisplayName(session: CodexSession): string {
  return session.projectName ?? session.sessionId;
}
```

- [ ] **Step 2: Derive display sessions in `App`**

Replace:

```tsx
const primary = snapshot.sessions[0];
```

with:

```tsx
const displaySessions = useMemo(() => getDisplaySessions(snapshot.sessions), [snapshot.sessions]);
const primary = displaySessions[0];
```

Replace `copy.idle` in compact label calculation with `ALWAYS_ENGLISH_IDLE`:

```tsx
const compactLabel = useMemo(() => {
  return primary ? sessionDisplayName(primary) : ALWAYS_ENGLISH_IDLE;
}, [primary]);
```

- [ ] **Step 3: Render compact session lights**

Replace the single summary dot:

```tsx
<span className="status-dot" aria-hidden="true" />
```

with:

```tsx
<div className="status-lights" aria-hidden={displaySessions.length === 0}>
  {displaySessions.length === 0 ? (
    <span className="status-dot" aria-hidden="true" />
  ) : displaySessions.map((session) => (
    <span
      key={session.sessionId}
      className={`session-light state-${session.state}`}
      data-testid="session-light"
      title={`${sessionDisplayName(session)}: ${session.state}`}
    />
  ))}
</div>
```

- [ ] **Step 4: Render expanded details for all displayed sessions**

Replace the `!primary ? ... : <article key={primary.sessionId}>` block with a `displaySessions.map` list. Each article should use the same metadata structure and fallbacks as the current primary article:

```tsx
{displaySessions.length === 0 ? (
  <p>{ALWAYS_ENGLISH_IDLE}</p>
) : (
  displaySessions.map((session) => (
    <article key={session.sessionId} className="session">
      <div className="session-primary">
        <strong className="session-title">{sessionDisplayName(session)}</strong>
        <span className="session-action">
          <span className="session-label">{copy.action}</span>
          <span className="session-value">{session.action ?? copy.unreportedAction}</span>
        </span>
      </div>
      <div className="session-meta" aria-label={copy.metadataLabel}>
        <span className="meta-item meta-model">
          <span className="meta-label">{copy.model}</span>
          <span className="meta-value">{session.model ?? copy.unknownModel}</span>
        </span>
        <span className="meta-item meta-cwd">
          <span className="meta-label">{copy.cwd}</span>
          <span className="meta-value">{session.cwd ?? copy.unknownCwd}</span>
        </span>
        <span className="meta-item meta-elapsed">
          <span className="meta-label">{copy.elapsed}</span>
          <span className="meta-value">{formatElapsed(session, now, copy.unknownElapsed)}</span>
        </span>
        <span className="meta-item meta-source">
          <span className="meta-label">{copy.source}</span>
          <span className="meta-value">{session.source}</span>
        </span>
        <span className="meta-item meta-count">
          <span className="meta-label">{copy.sessions}</span>
          <span className="meta-value">{copy.sessionCount(snapshot.activeSessionCount)}</span>
        </span>
      </div>
    </article>
  ))
)}
```

- [ ] **Step 5: Run renderer test**

Run:

```bash
npm test -- tests/renderer/App.test.tsx
```

Expected: renderer tests pass or fail only for CSS/test selector details addressed in Task 3.

## Task 3: Update CSS For Session Light Groups

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add status light group styles**

Preserve the current `.status-dot` rules and add:

```css
.status-lights {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  max-width: 112px;
  gap: 5px;
  overflow: hidden;
}

.session-light {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  color: #ff5d5d;
  background: #ff5d5d;
  box-shadow: 0 0 14px currentColor;
  flex: 0 0 auto;
}
```

- [ ] **Step 2: Extend state color selectors to session lights**

Update state selectors so they include per-session classes:

```css
.state-running .status-dot,
.session-light.state-running {
  color: #31d27c;
  background: #31d27c;
}

.state-waiting .status-dot,
.session-light.state-waiting {
  color: #ffd43b;
  background: #ffd43b;
  animation: pulse 1s ease-in-out infinite;
}

.state-idle .status-dot,
.state-completed .status-dot,
.state-error .status-dot,
.session-light.state-idle,
.session-light.state-completed,
.session-light.state-error {
  color: #ff5d5d;
  background: #ff5d5d;
}

.state-completed .status-dot,
.state-error .status-dot,
.session-light.state-completed,
.session-light.state-error {
  animation: pulse 1s ease-in-out infinite;
}
```

- [ ] **Step 3: Bound expanded multi-session layout**

Update `.expanded` and `.details`:

```css
.expanded {
  --island-width: 540px;
  --island-min-height: 112px;
  --island-radius: 24px;
}

.details {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
  padding: 0 16px 10px;
}
```

- [ ] **Step 4: Run renderer test**

Run:

```bash
npm test -- tests/renderer/App.test.tsx
```

Expected: renderer tests pass.

## Task 4: Add Demo Fixtures And Visual Coverage

**Files:**
- Modify: `src/renderer/demo-snapshot.ts`
- Modify: `tests/visual/island.spec.ts`

- [ ] **Step 1: Add `multi` demo support**

In `demoSnapshotFromLocation`, accept `demoState=multi` before `isDemoState`:

```ts
if (state === 'multi') return multiDemoSnapshot();
```

Add:

```ts
function multiDemoSnapshot(): CodexLightSnapshot {
  const sessions = Array.from({ length: 10 }, (_, index) => ({
    sessionId: `demo-multi-${index + 1}`,
    source: 'cli' as const,
    state: index === 0 ? 'waiting' as const : index % 3 === 0 ? 'completed' as const : 'running' as const,
    cwd: `C:\\code\\project-${index + 1}`,
    projectName: `project-${index + 1}`,
    model: 'gpt-5.5',
    action: index === 0 ? 'Waiting for approval: Bash' : `Running task ${index + 1}`,
    startedAt: '2026-05-31T00:00:00.000Z',
    updatedAt: `2026-05-31T00:00:${String(index + 1).padStart(2, '0')}.000Z`
  }));

  return {
    version: 1,
    generatedAt: '2026-05-31T00:00:00.000Z',
    globalState: 'waiting',
    activeSessionCount: sessions.filter((session) => session.state !== 'idle').length,
    sessions,
    diagnostics: []
  };
}
```

- [ ] **Step 2: Update visual selectors**

In existing visual tests, keep `.status-dot` expectations for idle single-dot states where needed, and use `.session-light` for active demo states:

```ts
await expect(page.locator('.session-light')).toHaveCount(1);
```

- [ ] **Step 3: Add multi-session visual test**

Append:

```ts
test('renderer shows up to ten compact session lights', async ({ page }) => {
  await page.goto('/?demoState=multi');

  await expect(page.locator('.session-light')).toHaveCount(10);
  await expect(page.locator('.summary-text strong')).toHaveText('project-1');
});

test('renderer shows multiple expanded session details', async ({ page }) => {
  await page.goto('/?demoState=multi');
  await page.locator('.island').hover();

  await expect(page.locator('.island')).toHaveClass(/expanded/);
  await expect(page.getByText('Waiting for approval: Bash')).toBeVisible();
  await expect(page.getByText('Running task 10')).toBeVisible();
});
```

- [ ] **Step 4: Run visual test**

Run:

```bash
npm run test:visual -- tests/visual/island.spec.ts
```

Expected: visual tests pass.

## Task 5: Update OpenSpec Tasks And Final Verification

**Files:**
- Modify: `openspec/changes/support-multiple-cli-lights/tasks.md`

- [ ] **Step 1: Mark implementation tasks complete**

Change every checkbox in `openspec/changes/support-multiple-cli-lights/tasks.md` from `- [ ]` to `- [x]` after the focused tests pass.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm test -- tests/renderer/App.test.tsx
npm run test:visual -- tests/visual/island.spec.ts
npm run typecheck
openspec validate support-multiple-cli-lights --strict
```

Expected: all commands pass.

- [ ] **Step 3: Report dirty worktree scope**

Before build guard, run:

```bash
git status --short
git diff --stat
```

Report which dirty files belong to this change and which pre-existing dirty files remain outside it. Do not commit unless the user explicitly asks for a commit or Astrolabe completion requires a milestone commit and the dirty scope is clearly attributable.
