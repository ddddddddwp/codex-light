---
change: codex-traffic-light-monitor
design-doc: docs/superpowers/specs/2026-05-31-codex-traffic-light-monitor-design.md
base-ref: a75acb838bc408f681456c125916276fb2d075a3
archived-with: 2026-05-31-codex-traffic-light-monitor
---

# Codex Traffic Light Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Win11-first Electron + React + TypeScript app that shows Codex CLI/Desktop status in a top-center expandable island.

**Architecture:** Codex hook events are ingested by a Node CLI into local JSONL/snapshot files. Electron main watches the snapshot and sends normalized state to a React renderer that displays the compact/expanded island. Shared `src/core` code owns parsing, normalization, aggregation, runtime paths, and persistence.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, Testing Library, Playwright, electron-builder.

archived-with: 2026-05-31-codex-traffic-light-monitor
---

## File Structure

- Create: `package.json` - scripts, dependencies, package metadata, bin entries.
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.renderer.json` - TypeScript configuration.
- Create: `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts` - build configs.
- Create: `vitest.config.ts`, `playwright.config.ts` - test configs.
- Create: `.gitignore` - ignore tool/runtime/build artifacts.
- Create: `src/core/types.ts` - normalized event/session/snapshot types.
- Create: `src/core/runtime-paths.ts` - runtime directory resolution.
- Create: `src/core/normalize.ts` - hook/fallback parsing and aggregation.
- Create: `src/core/storage.ts` - JSONL append and atomic snapshot writes.
- Create: `src/hook-cli/index.ts` - `codex-light hook`, `install-hooks`, and `doctor` command entry.
- Create: `src/hook-cli/install-hooks.ts` - idempotent Codex hook config update.
- Create: `src/hook-cli/doctor.ts` - diagnostics.
- Create: `src/main/main.ts` - Electron app, overlay window, tray, file watcher, desktop fallback.
- Create: `src/main/preload.ts` - safe IPC bridge.
- Create: `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/styles.css` - island UI.
- Create: `src/renderer/state-labels.ts` - status copy and color mapping.
- Create: `tests/fixtures/*.json` - hook payload fixtures.
- Create: `tests/core/*.test.ts`, `tests/hook-cli/*.test.ts`, `tests/renderer/*.test.ts`, `tests/visual/island.spec.ts` - verification.
- Create: `docs/setup-win11.md` - development and installation instructions.

## Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.renderer.json`
- Create: `vite.main.config.ts`
- Create: `vite.preload.config.ts`
- Create: `vite.renderer.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add package metadata and scripts**

Create `package.json` with these scripts and dependencies:

```json
{
  "name": "codex-light",
  "version": "0.1.0",
  "private": true,
  "description": "Win11 top island monitor for Codex CLI and desktop status.",
  "type": "module",
  "main": "dist/main/main.js",
  "bin": {
    "codex-light": "dist/hook-cli/index.js"
  },
  "scripts": {
    "dev": "vite --config vite.renderer.config.ts",
    "dev:electron": "concurrently -k \"vite --config vite.renderer.config.ts --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
    "build": "npm run clean && npm run typecheck && npm run build:main && npm run build:preload && npm run build:renderer",
    "build:main": "vite build --config vite.main.config.ts",
    "build:preload": "vite build --config vite.preload.config.ts",
    "build:renderer": "vite build --config vite.renderer.config.ts",
    "clean": "rimraf dist",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:visual": "playwright test",
    "package:win": "npm run build && electron-builder --win --x64"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "chokidar": "^4.0.3",
    "commander": "^14.0.2",
    "concurrently": "^9.2.1",
    "cross-env": "^10.1.0",
    "electron-log": "^5.4.3",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "wait-on": "^9.0.3",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@electron/rebuild": "^4.0.1",
    "@playwright/test": "^1.57.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@typescript-eslint/eslint-plugin": "^8.48.0",
    "@typescript-eslint/parser": "^8.48.0",
    "electron": "^39.2.6",
    "electron-builder": "^26.0.12",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "jsdom": "^27.2.0",
    "rimraf": "^6.1.2",
    "typescript": "^5.9.3",
    "vite": "^7.2.4",
    "vitest": "^4.0.14"
  },
  "build": {
    "appId": "dev.codex-light.app",
    "productName": "Codex Light",
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    }
  }
}
```

- [ ] **Step 2: Add ignore rules**

Create `.gitignore`:

```gitignore
node_modules/
dist/
release/
coverage/
test-results/
playwright-report/
.env
.DS_Store
*.log
.codegraph/
.superpowers/
.agents/
.codex/
```

- [ ] **Step 3: Add TypeScript configs**

Create root and target configs:

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.renderer.json" }
  ]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"],
    "outDir": "dist-types/node"
  },
  "include": ["src/core/**/*.ts", "src/hook-cli/**/*.ts", "src/main/**/*.ts", "tests/**/*.ts", "*.config.ts"]
}
```

```json
// tsconfig.renderer.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client", "vitest/globals"],
    "outDir": "dist-types/renderer"
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.tsx", "tests/renderer/**/*.ts", "tests/renderer/**/*.tsx"]
}
```

- [ ] **Step 4: Add Vite configs**

Create three Vite configs. Main and preload output CommonJS-compatible Electron bundles; renderer outputs static assets.

```ts
// vite.main.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/main',
    emptyOutDir: true,
    lib: {
      entry: 'src/main/main.ts',
      formats: ['es'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: ['electron']
    }
  }
});
```

```ts
// vite.preload.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/preload',
    emptyOutDir: true,
    lib: {
      entry: 'src/main/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.cjs'
    },
    rollupOptions: {
      external: ['electron']
    }
  }
});
```

```ts
// vite.renderer.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
```

- [ ] **Step 5: Add test configs**

Create `vitest.config.ts` and `playwright.config.ts`:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  }
});
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/visual',
  timeout: 30_000,
  use: {
    viewport: { width: 1280, height: 720 }
  }
});
```

- [ ] **Step 6: Verify foundation**

Run: `npm install`

Expected: dependency installation completes and creates `package-lock.json`.

Run: `npm run typecheck`

Expected before source files exist: TypeScript may fail due missing entry files. Continue to Task 2 before treating this as a defect.

## Task 2: Core Types, Paths, Normalization, And Storage

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/runtime-paths.ts`
- Create: `src/core/normalize.ts`
- Create: `src/core/storage.ts`
- Create: `tests/setup.ts`
- Create: `tests/fixtures/session-start.json`
- Create: `tests/fixtures/permission-request.json`
- Create: `tests/fixtures/stop.json`
- Create: `tests/core/normalize.test.ts`
- Create: `tests/core/storage.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Create `tests/core/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import sessionStart from '../fixtures/session-start.json';
import permissionRequest from '../fixtures/permission-request.json';
import stop from '../fixtures/stop.json';
import { aggregateSessions, normalizeHookPayload } from '../../src/core/normalize';

describe('normalizeHookPayload', () => {
  it('maps SessionStart to running', () => {
    const event = normalizeHookPayload(sessionStart);
    expect(event.state).toBe('running');
    expect(event.sessionId).toBe('session-1');
    expect(event.source).toBe('cli');
  });

  it('maps PermissionRequest to waiting', () => {
    const event = normalizeHookPayload(permissionRequest);
    expect(event.state).toBe('waiting');
    expect(event.action).toContain('approval');
  });

  it('maps Stop to completed', () => {
    const event = normalizeHookPayload(stop);
    expect(event.state).toBe('completed');
  });

  it('aggregates waiting above running', () => {
    const running = normalizeHookPayload(sessionStart);
    const waiting = normalizeHookPayload(permissionRequest);
    const snapshot = aggregateSessions([running, waiting], new Date('2026-05-31T00:00:03.000Z'));
    expect(snapshot.globalState).toBe('waiting');
    expect(snapshot.activeSessionCount).toBe(1);
  });
});
```

Create fixtures:

```json
// tests/fixtures/session-start.json
{
  "hook_event_name": "SessionStart",
  "session_id": "session-1",
  "cwd": "C:\\\\code\\\\demo",
  "model": "gpt-5.5",
  "permission_mode": "default"
}
```

```json
// tests/fixtures/permission-request.json
{
  "hook_event_name": "PermissionRequest",
  "session_id": "session-1",
  "turn_id": "turn-1",
  "cwd": "C:\\\\code\\\\demo",
  "model": "gpt-5.5",
  "permission_mode": "default",
  "tool_name": "Bash"
}
```

```json
// tests/fixtures/stop.json
{
  "hook_event_name": "Stop",
  "session_id": "session-1",
  "turn_id": "turn-1",
  "cwd": "C:\\\\code\\\\demo",
  "model": "gpt-5.5",
  "permission_mode": "default"
}
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/core/normalize.test.ts`

Expected: FAIL because `src/core/normalize.ts` does not exist.

- [ ] **Step 3: Implement core types and normalization**

Create `src/core/types.ts`:

```ts
export type CodexLightState = 'idle' | 'running' | 'waiting' | 'completed' | 'error';
export type CodexLightSource = 'cli' | 'desktop' | 'desktop-fallback';

export interface RawCodexHookPayload {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string;
  model?: string;
  turn_id?: string;
  permission_mode?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  [key: string]: unknown;
}

export interface CodexLightEvent {
  eventId: string;
  sessionId: string;
  source: CodexLightSource;
  state: CodexLightState;
  hookEventName: string;
  cwd?: string;
  projectName?: string;
  model?: string;
  action?: string;
  turnId?: string;
  fallbackReason?: string;
  createdAt: string;
  raw: RawCodexHookPayload;
}

export interface CodexSession {
  sessionId: string;
  source: CodexLightSource;
  state: CodexLightState;
  cwd?: string;
  projectName?: string;
  model?: string;
  action?: string;
  startedAt: string;
  updatedAt: string;
  turnId?: string;
  fallbackReason?: string;
}

export interface DiagnosticEvent {
  level: 'info' | 'warning' | 'error';
  message: string;
  createdAt: string;
}

export interface CodexLightSnapshot {
  version: 1;
  generatedAt: string;
  globalState: CodexLightState;
  activeSessionCount: number;
  sessions: CodexSession[];
  diagnostics: DiagnosticEvent[];
}
```

Create `src/core/normalize.ts`:

```ts
import path from 'node:path';
import type {
  CodexLightEvent,
  CodexLightSnapshot,
  CodexLightState,
  RawCodexHookPayload
} from './types';

const PRIORITY: Record<CodexLightState, number> = {
  waiting: 5,
  running: 4,
  error: 3,
  completed: 2,
  idle: 1
};

export function normalizeHookPayload(input: unknown, now = new Date()): CodexLightEvent {
  if (!isRecord(input)) {
    throw new Error('Hook payload must be a JSON object.');
  }

  const payload = input as RawCodexHookPayload;
  const hookEventName = readString(payload.hook_event_name, 'hook_event_name');
  const sessionId = readString(payload.session_id, 'session_id');
  const cwd = typeof payload.cwd === 'string' ? payload.cwd : undefined;
  const model = typeof payload.model === 'string' ? payload.model : undefined;
  const turnId = typeof payload.turn_id === 'string' ? payload.turn_id : undefined;
  const state = stateForHook(hookEventName);

  return {
    eventId: `${sessionId}:${hookEventName}:${turnId ?? 'session'}:${now.toISOString()}`,
    sessionId,
    source: 'cli',
    state,
    hookEventName,
    cwd,
    projectName: cwd ? path.basename(cwd) : undefined,
    model,
    action: actionForHook(hookEventName, payload),
    turnId,
    createdAt: now.toISOString(),
    raw: payload
  };
}

export function aggregateSessions(events: CodexLightEvent[], now = new Date()): CodexLightSnapshot {
  const bySession = new Map<string, CodexLightEvent[]>();

  for (const event of events) {
    const existing = bySession.get(event.sessionId) ?? [];
    existing.push(event);
    bySession.set(event.sessionId, existing);
  }

  const sessions = Array.from(bySession.entries()).map(([sessionId, sessionEvents]) => {
    const sorted = [...sessionEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const effective = chooseEffectiveEvent(sorted);

    return {
      sessionId,
      source: effective.source,
      state: effective.state,
      cwd: effective.cwd ?? last.cwd,
      projectName: effective.projectName ?? last.projectName,
      model: effective.model ?? last.model,
      action: effective.action,
      startedAt: first.createdAt,
      updatedAt: last.createdAt,
      turnId: effective.turnId ?? last.turnId,
      fallbackReason: effective.fallbackReason
    };
  });

  const activeSessions = sessions.filter((session) => session.state !== 'idle');
  const globalState = sessions.reduce<CodexLightState>((winner, session) => (
    PRIORITY[session.state] > PRIORITY[winner] ? session.state : winner
  ), 'idle');

  return {
    version: 1,
    generatedAt: now.toISOString(),
    globalState,
    activeSessionCount: activeSessions.length,
    sessions,
    diagnostics: []
  };
}

function chooseEffectiveEvent(events: CodexLightEvent[]): CodexLightEvent {
  return events.reduce((winner, event) => {
    if (event.createdAt < winner.createdAt) return winner;
    if (PRIORITY[event.state] > PRIORITY[winner.state]) return event;
    return event;
  }, events[0]);
}

function stateForHook(hookEventName: string): CodexLightState {
  if (hookEventName === 'PermissionRequest') return 'waiting';
  if (hookEventName === 'Stop' || hookEventName === 'SessionEnd' || hookEventName === 'SubagentStop') return 'completed';
  if (hookEventName === 'HookError') return 'error';
  return 'running';
}

function actionForHook(hookEventName: string, payload: RawCodexHookPayload): string {
  if (hookEventName === 'PermissionRequest') return `Waiting for approval${payload.tool_name ? `: ${payload.tool_name}` : ''}`;
  if (hookEventName === 'PreToolUse') return `Running ${payload.tool_name ?? 'tool'}`;
  if (hookEventName === 'PostToolUse') return `Finished ${payload.tool_name ?? 'tool'}`;
  if (hookEventName === 'Stop') return 'Turn completed';
  if (hookEventName === 'UserPromptSubmit') return 'Prompt submitted';
  if (hookEventName === 'SessionStart') return 'Session started';
  return hookEventName;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required hook field: ${field}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Add runtime paths and storage with tests**

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `tests/core/storage.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sessionStart from '../fixtures/session-start.json';
import { normalizeHookPayload } from '../../src/core/normalize';
import { appendEvent, readEvents, writeSnapshotAtomic } from '../../src/core/storage';

describe('storage', () => {
  it('appends events and writes snapshots atomically', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-'));
    const event = normalizeHookPayload(sessionStart, new Date('2026-05-31T00:00:00.000Z'));

    await appendEvent(dir, event);
    const events = await readEvents(dir);
    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe('session-1');

    await writeSnapshotAtomic(dir, {
      version: 1,
      generatedAt: '2026-05-31T00:00:01.000Z',
      globalState: 'running',
      activeSessionCount: 1,
      sessions: [],
      diagnostics: []
    });

    const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'state.json'), 'utf8'));
    expect(snapshot.globalState).toBe('running');
  });
});
```

Create `src/core/runtime-paths.ts`:

```ts
import os from 'node:os';
import path from 'node:path';

export function getRuntimeDir(env = process.env): string {
  if (env.CODEX_LIGHT_HOME) return env.CODEX_LIGHT_HOME;
  if (process.platform === 'win32' && env.LOCALAPPDATA) {
    return path.join(env.LOCALAPPDATA, 'CodexLight');
  }
  return path.join(os.tmpdir(), 'CodexLight');
}

export function getStateFile(runtimeDir = getRuntimeDir()): string {
  return path.join(runtimeDir, 'state.json');
}

export function getEventLogFile(runtimeDir = getRuntimeDir()): string {
  return path.join(runtimeDir, 'events.jsonl');
}
```

Create `src/core/storage.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CodexLightEvent, CodexLightSnapshot } from './types';
import { getEventLogFile, getStateFile } from './runtime-paths';

export async function appendEvent(runtimeDir: string, event: CodexLightEvent): Promise<void> {
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.appendFile(getEventLogFile(runtimeDir), `${JSON.stringify(event)}\n`, 'utf8');
}

export async function readEvents(runtimeDir: string): Promise<CodexLightEvent[]> {
  try {
    const content = await fs.readFile(getEventLogFile(runtimeDir), 'utf8');
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as CodexLightEvent);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function writeSnapshotAtomic(runtimeDir: string, snapshot: CodexLightSnapshot): Promise<void> {
  await fs.mkdir(runtimeDir, { recursive: true });
  const target = getStateFile(runtimeDir);
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify(snapshot, null, 2), 'utf8');
  await fs.rename(temp, target);
}

export async function readSnapshot(runtimeDir: string): Promise<CodexLightSnapshot | null> {
  try {
    const content = await fs.readFile(getStateFile(runtimeDir), 'utf8');
    return JSON.parse(content) as CodexLightSnapshot;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
```

- [ ] **Step 5: Verify core**

Run: `npm test -- tests/core/normalize.test.ts tests/core/storage.test.ts`

Expected: PASS.

## Task 3: Hook CLI, Installer, And Doctor

**Files:**
- Create: `src/hook-cli/index.ts`
- Create: `src/hook-cli/install-hooks.ts`
- Create: `src/hook-cli/doctor.ts`
- Create: `tests/hook-cli/hook-cli.test.ts`
- Create: `tests/hook-cli/install-hooks.test.ts`

- [ ] **Step 1: Write failing hook CLI tests**

Create `tests/hook-cli/hook-cli.test.ts` that spawns the built TypeScript source through `tsx` if added or calls exported functions directly. Prefer exported functions to keep tests fast:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleHookInput } from '../../src/hook-cli/index';

describe('handleHookInput', () => {
  it('writes snapshot from valid stdin JSON', async () => {
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-'));
    const exitCode = await handleHookInput(JSON.stringify({
      hook_event_name: 'SessionStart',
      session_id: 'session-cli',
      cwd: 'C:\\\\code\\\\demo',
      model: 'gpt-5.5'
    }), runtimeDir);

    expect(exitCode).toBe(0);
    const snapshot = JSON.parse(await fs.readFile(path.join(runtimeDir, 'state.json'), 'utf8'));
    expect(snapshot.globalState).toBe('running');
  });

  it('returns non-zero for invalid JSON', async () => {
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-'));
    const exitCode = await handleHookInput('{bad json', runtimeDir);
    expect(exitCode).toBe(1);
  });
});
```

- [ ] **Step 2: Implement hook CLI**

Create `src/hook-cli/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { aggregateSessions, normalizeHookPayload } from '../core/normalize';
import { getRuntimeDir } from '../core/runtime-paths';
import { appendEvent, readEvents, writeSnapshotAtomic } from '../core/storage';
import { doctor } from './doctor';
import { installHooks } from './install-hooks';

export async function handleHookInput(input: string, runtimeDir = getRuntimeDir()): Promise<number> {
  try {
    const parsed = JSON.parse(input);
    const event = normalizeHookPayload(parsed);
    await appendEvent(runtimeDir, event);
    const events = await readEvents(runtimeDir);
    await writeSnapshotAtomic(runtimeDir, aggregateSessions(events));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const program = new Command();
  program.name('codex-light');

  program
    .command('hook')
    .description('Record one Codex hook payload from stdin.')
    .action(async () => {
      const code = await handleHookInput(await readStdin());
      process.exitCode = code;
    });

  program
    .command('install-hooks')
    .option('--config <path>', 'Codex config path override')
    .option('--hook-command <command>', 'Command Codex should run')
    .action(async (options: { config?: string; hookCommand?: string }) => {
      await installHooks(options);
    });

  program
    .command('doctor')
    .option('--config <path>', 'Codex config path override')
    .action(async (options: { config?: string }) => {
      const report = await doctor(options);
      console.log(JSON.stringify(report, null, 2));
    });

  await program.parseAsync(process.argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 3: Implement hook installer and doctor**

Use JSON `hooks.json` for the first implementation because it is easier to update safely than inline TOML. Create marker-managed config while preserving existing hooks.

Create `src/hook-cli/install-hooks.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'Stop'];
const MARKER = 'Codex Light generated hook block';

export interface InstallHooksOptions {
  config?: string;
  hookCommand?: string;
}

export async function installHooks(options: InstallHooksOptions = {}): Promise<string> {
  const configPath = options.config ?? defaultHooksPath();
  const hookCommand = options.hookCommand ?? 'codex-light hook';
  const current = await readHooks(configPath);
  const next = { ...current, description: current.description ?? 'Codex hooks' };

  next.hooks = next.hooks ?? {};
  for (const event of EVENTS) {
    const groups = Array.isArray(next.hooks[event]) ? next.hooks[event] : [];
    const withoutExisting = groups.filter((group: HookGroup) => group.description !== MARKER);
    withoutExisting.push({
      description: MARKER,
      hooks: [
        {
          type: 'command',
          command: hookCommand,
          commandWindows: hookCommand,
          timeout: 5
        }
      ]
    });
    next.hooks[event] = withoutExisting;
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await backupIfExists(configPath);
  await fs.writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return configPath;
}

interface HookGroup {
  description?: string;
  hooks?: unknown[];
}

interface HooksFile {
  description?: string;
  hooks?: Record<string, HookGroup[]>;
}

async function readHooks(configPath: string): Promise<HooksFile> {
  try {
    return JSON.parse(await fs.readFile(configPath, 'utf8')) as HooksFile;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {};
    throw error;
  }
}

async function backupIfExists(configPath: string): Promise<void> {
  try {
    await fs.copyFile(configPath, `${configPath}.bak`);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return;
    throw error;
  }
}

function defaultHooksPath(): string {
  return path.join(os.homedir(), '.codex', 'hooks.json');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
```

Create `src/hook-cli/doctor.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getRuntimeDir, getStateFile } from '../core/runtime-paths';

export interface DoctorReport {
  runtimeDir: string;
  stateFile: string;
  hooksPath: string;
  runtimeWritable: boolean;
  stateExists: boolean;
  hooksExists: boolean;
}

export async function doctor(options: { config?: string } = {}): Promise<DoctorReport> {
  const runtimeDir = getRuntimeDir();
  const hooksPath = options.config ?? path.join(os.homedir(), '.codex', 'hooks.json');
  await fs.mkdir(runtimeDir, { recursive: true });

  return {
    runtimeDir,
    stateFile: getStateFile(runtimeDir),
    hooksPath,
    runtimeWritable: await canWrite(runtimeDir),
    stateExists: await exists(getStateFile(runtimeDir)),
    hooksExists: await exists(hooksPath)
  };
}

async function canWrite(dir: string): Promise<boolean> {
  const probe = path.join(dir, '.doctor-write-test');
  try {
    await fs.writeFile(probe, 'ok', 'utf8');
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Verify hook CLI**

Run: `npm test -- tests/hook-cli/hook-cli.test.ts`

Expected: PASS.

## Task 4: Electron Main Process And IPC

**Files:**
- Create: `src/main/main.ts`
- Create: `src/main/preload.ts`
- Create: `src/main/ipc-types.ts`

- [ ] **Step 1: Implement preload IPC bridge**

Create `src/main/ipc-types.ts`:

```ts
import type { CodexLightSnapshot } from '../core/types';

export interface CodexLightApi {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void): () => void;
  setPinnedExpanded(value: boolean): void;
}

declare global {
  interface Window {
    codexLight: CodexLightApi;
  }
}
```

Create `src/main/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { CodexLightSnapshot } from '../core/types';

contextBridge.exposeInMainWorld('codexLight', {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void) {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: CodexLightSnapshot) => callback(snapshot);
    ipcRenderer.on('snapshot', listener);
    return () => ipcRenderer.off('snapshot', listener);
  },
  setPinnedExpanded(value: boolean) {
    ipcRenderer.send('set-pinned-expanded', value);
  }
});
```

- [ ] **Step 2: Implement main process**

Create `src/main/main.ts`:

```ts
import { app, BrowserWindow, Menu, Tray, ipcMain, screen } from 'electron';
import path from 'node:path';
import { watch } from 'chokidar';
import { getRuntimeDir, getStateFile } from '../core/runtime-paths';
import { readSnapshot } from '../core/storage';

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;

const COMPACT = { width: 280, height: 70 };
const EXPANDED = { width: 560, height: 108 };

async function createOverlay(): Promise<void> {
  const size = COMPACT;
  overlay = new BrowserWindow({
    width: size.width,
    height: size.height,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist/preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  positionOverlay(COMPACT);

  if (process.env.VITE_DEV_SERVER_URL) {
    await overlay.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await overlay.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }

  overlay.once('ready-to-show', () => overlay?.showInactive());
}

function positionOverlay(size: { width: number; height: number }): void {
  if (!overlay) return;
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  overlay.setBounds({
    x: Math.round(x + width / 2 - size.width / 2),
    y: y + 10,
    width: size.width,
    height: size.height
  });
}

function createTray(): void {
  tray = new Tray(path.join(app.getAppPath(), 'assets', 'tray.png'));
  tray.setToolTip('Codex Light');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Island', click: () => overlay?.showInactive() },
    { label: 'Hide Island', click: () => overlay?.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
}

function watchSnapshot(): void {
  const runtimeDir = getRuntimeDir();
  const stateFile = getStateFile(runtimeDir);
  const watcher = watch(stateFile, { ignoreInitial: false, awaitWriteFinish: true });
  watcher.on('add', sendSnapshot);
  watcher.on('change', sendSnapshot);
}

async function sendSnapshot(): Promise<void> {
  const snapshot = await readSnapshot(getRuntimeDir());
  if (snapshot && overlay) {
    overlay.webContents.send('snapshot', snapshot);
  }
}

ipcMain.on('set-pinned-expanded', (_event, value: boolean) => {
  const size = value ? EXPANDED : COMPACT;
  positionOverlay(size);
});

app.whenReady().then(async () => {
  await createOverlay();
  createTray();
  watchSnapshot();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
```

Note: before final implementation, either create `assets/tray.png` or change tray creation to use a generated native image to avoid missing-file startup failure.

- [ ] **Step 3: Verify main build**

Run: `npm run build:main && npm run build:preload`

Expected: PASS.

## Task 5: React Island Renderer

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/state-labels.ts`
- Create: `src/renderer/styles.css`
- Create: `tests/renderer/App.test.tsx`

- [ ] **Step 1: Write renderer test**

Create `tests/renderer/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/renderer/App';
import type { CodexLightSnapshot } from '../../src/core/types';

const snapshot: CodexLightSnapshot = {
  version: 1,
  generatedAt: '2026-05-31T00:00:00.000Z',
  globalState: 'waiting',
  activeSessionCount: 1,
  sessions: [
    {
      sessionId: 'session-1',
      source: 'cli',
      state: 'waiting',
      cwd: 'C:\\\\code\\\\demo',
      projectName: 'demo',
      model: 'gpt-5.5',
      action: 'Waiting for approval: Bash',
      startedAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:02.000Z'
    }
  ],
  diagnostics: []
};

describe('App', () => {
  it('renders waiting island details', () => {
    render(<App initialSnapshot={snapshot} />);
    expect(screen.getByText('等待确认')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement renderer files**

Create `src/renderer/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex Light</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Create `src/renderer/state-labels.ts`:

```ts
import type { CodexLightState } from '../core/types';

export const STATE_LABEL: Record<CodexLightState, string> = {
  idle: '空闲',
  running: '运行中',
  waiting: '等待确认',
  completed: '已结束',
  error: '发生错误'
};
```

Create `src/renderer/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { CodexLightSnapshot } from '../core/types';
import { STATE_LABEL } from './state-labels';
import './styles.css';

const EMPTY: CodexLightSnapshot = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  globalState: 'idle',
  activeSessionCount: 0,
  sessions: [],
  diagnostics: []
};

export function App({ initialSnapshot = EMPTY }: { initialSnapshot?: CodexLightSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [expanded, setExpanded] = useState(false);
  const primary = snapshot.sessions[0];

  useEffect(() => {
    if (!window.codexLight) return;
    return window.codexLight.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    window.codexLight?.setPinnedExpanded(expanded);
  }, [expanded]);

  const subtitle = useMemo(() => {
    if (!primary) return '等待 Codex 活动';
    return [primary.projectName, primary.source.toUpperCase(), primary.model].filter(Boolean).join(' · ');
  }, [primary]);

  return (
    <main
      className={`island state-${snapshot.globalState} ${expanded ? 'expanded' : 'compact'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded((value) => !value)}
    >
      <section className="summary">
        <span className="status-dot" aria-hidden="true" />
        <div className="summary-text">
          <strong>{STATE_LABEL[snapshot.globalState]}</strong>
          <span>{subtitle}</span>
        </div>
        {snapshot.activeSessionCount > 1 && <span className="count">{snapshot.activeSessionCount}</span>}
      </section>

      {expanded && (
        <section className="details">
          {snapshot.sessions.length === 0 ? (
            <p>暂无活动会话</p>
          ) : snapshot.sessions.map((session) => (
            <article key={session.sessionId} className="session">
              <div>
                <strong>{session.projectName ?? session.cwd ?? session.sessionId}</strong>
                <span>{session.action ?? STATE_LABEL[session.state]}</span>
              </div>
              <small>{session.source}{session.fallbackReason ? ` · ${session.fallbackReason}` : ''}</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
```

Create `src/renderer/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `src/renderer/styles.css`:

```css
* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  overflow: hidden;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
}

.island {
  margin: 8px auto 0;
  color: #fff;
  background: rgba(12, 16, 23, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
  transition: width 180ms ease, height 180ms ease, border-radius 180ms ease;
  user-select: none;
}

.compact {
  width: 260px;
  min-height: 52px;
  border-radius: 999px;
}

.expanded {
  width: 540px;
  min-height: 94px;
  border-radius: 30px;
}

.summary {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #9ca3af;
  box-shadow: 0 0 18px currentColor;
}

.state-running .status-dot {
  color: #31d27c;
  background: #31d27c;
}

.state-waiting .status-dot {
  color: #ffd43b;
  background: #ffd43b;
  animation: pulse 1.2s ease-in-out infinite;
}

.state-completed .status-dot,
.state-error .status-dot {
  color: #ff5d5d;
  background: #ff5d5d;
}

.summary-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.18;
}

.summary-text strong {
  font-size: 14px;
}

.summary-text span,
.details small {
  color: #aeb7c4;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.count {
  margin-left: auto;
  color: #aeb7c4;
  font-size: 12px;
}

.details {
  display: grid;
  gap: 8px;
  padding: 0 18px 14px;
}

.session {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
}

.session div {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.session span {
  color: #aeb7c4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.74; }
}
```

- [ ] **Step 3: Verify renderer**

Run: `npm test -- tests/renderer/App.test.tsx`

Expected: PASS.

Run: `npm run build:renderer`

Expected: PASS.

## Task 6: Desktop Fallback, Visual Tests, Docs, And Packaging

**Files:**
- Create: `src/main/desktop-fallback.ts`
- Create: `assets/tray.svg`
- Create: `tests/visual/island.spec.ts`
- Create: `docs/setup-win11.md`
- Modify: `src/main/main.ts`
- Modify: `openspec/changes/codex-traffic-light-monitor/tasks.md`

- [ ] **Step 1: Add desktop fallback detector**

Create `src/main/desktop-fallback.ts`:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function detectCodexDesktopProcess(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      "Get-Process | Where-Object { $_.ProcessName -match 'codex|chatgpt' } | Select-Object -First 1 -ExpandProperty ProcessName"
    ]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
```

Modify `src/main/main.ts` after Task 4 by importing and polling `detectCodexDesktopProcess`. When true and no recent desktop hook exists, send a snapshot with a `desktop-fallback` session if no stronger CLI state exists. Keep this change small and covered by a later unit test when the detector is extracted further.

- [ ] **Step 2: Add visual test**

Create `tests/visual/island.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('renderer shows waiting island', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.locator('.island')).toBeVisible();
  await expect(page.locator('.summary-text strong')).toHaveText(/空闲|运行中|等待确认|已结束|发生错误/);
});
```

Run for development with the renderer server already running:

```bash
npm run dev
npm run test:visual
```

Expected: PASS when `npm run dev` is serving the renderer.

- [ ] **Step 3: Add setup docs**

Create `docs/setup-win11.md`:

```md
# Codex Light Win11 Setup

## Development

```bash
npm install
npm run dev:electron
```

## Hook Installation

```bash
npm run build
node dist/hook-cli/index.js install-hooks
node dist/hook-cli/index.js doctor
```

## Runtime Files

Codex Light stores runtime state under `%LOCALAPPDATA%/CodexLight` on Windows.

- `events.jsonl`: hook event history
- `state.json`: current island snapshot

## Manual Hook Snippet

Codex hooks can invoke:

```powershell
codex-light hook
```

The command reads one hook JSON payload from stdin.
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Update OpenSpec task checkboxes**

After implementation and verification pass, mark completed items in `openspec/changes/codex-traffic-light-monitor/tasks.md` from `- [ ]` to `- [x]` for the implemented tasks.

## Self-Review

Spec coverage:

- `codex-status-ingestion` is covered by Tasks 2, 3, and 6.
- `top-island-overlay` is covered by Tasks 4, 5, and visual checks in Task 6.
- `win11-app-operations` is covered by Tasks 3, 4, and 6.

Known execution constraint:

- The repository was initialized as a git repository after the plan was drafted. `base-ref` now points at the planning baseline commit.
