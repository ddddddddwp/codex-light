import path from 'node:path';
import type {
  CodexLightEvent,
  CodexLightSnapshot,
  CodexSession,
  CodexLightState,
  RawCodexHookPayload
} from './types';

export const DEFAULT_CLI_SESSION_STALE_MS = 120_000;
export const DEFAULT_CLI_INACTIVE_SESSION_RETAIN_MS = 15_000;

const PRIORITY: Record<CodexLightState, number> = {
  waiting: 5,
  running: 4,
  error: 3,
  completed: 2,
  idle: 1
};

const APPROVAL_FLAG_FIELDS = [
  'requires_permission',
  'requires_approval',
  'permission_required',
  'approval_required',
  'needs_permission',
  'needs_approval'
] as const;

const PERMISSION_GATED_TOOLS = new Set([
  'applypatch',
  'bash',
  'edit',
  'execcommand',
  'functionsexeccommand',
  'multi_edit',
  'multiedit',
  'notebookedit',
  'shell',
  'write'
]);

const STALE_CLI_STATES = new Set<CodexLightState>(['running', 'waiting']);
const INACTIVE_CLI_STATES = new Set<CodexLightState>(['idle', 'completed']);

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
  const state = stateForHook(hookEventName, payload);
  const timestamp = now.toISOString();

  return {
    eventId: `${sessionId}:${hookEventName}:${turnId ?? 'session'}:${timestamp}`,
    sessionId,
    source: payload.source === 'desktop' ? 'desktop' : 'cli',
    state,
    hookEventName,
    cwd,
    projectName: cwd ? projectNameFromCwd(cwd) : undefined,
    model,
    action: actionForHook(hookEventName, payload),
    turnId,
    createdAt: timestamp,
    raw: payload
  };
}

export function createDesktopFallbackEvent(now = new Date()): CodexLightEvent {
  const timestamp = now.toISOString();
  return {
    eventId: `desktop-fallback:ProcessDetected:${timestamp}`,
    sessionId: 'desktop-fallback',
    source: 'desktop-fallback',
    state: 'running',
    hookEventName: 'DesktopFallback',
    action: 'Codex desktop process detected',
    fallbackReason: 'process presence',
    createdAt: timestamp,
    raw: {
      hook_event_name: 'DesktopFallback',
      session_id: 'desktop-fallback',
      source: 'desktop-fallback'
    }
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

  return {
    version: 1,
    generatedAt: now.toISOString(),
    globalState: globalStateForSessions(sessions),
    activeSessionCount: activeSessionCount(sessions),
    sessions,
    diagnostics: []
  };
}

export function expireStaleCliSessions(
  snapshot: CodexLightSnapshot,
  now = new Date(),
  staleMs = DEFAULT_CLI_SESSION_STALE_MS,
  inactiveRetainMs = DEFAULT_CLI_INACTIVE_SESSION_RETAIN_MS
): CodexLightSnapshot {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || (staleMs <= 0 && inactiveRetainMs <= 0)) return snapshot;

  const sessions = snapshot.sessions.filter((session) => (
    !isExpiredCliSession(session, nowMs, staleMs, inactiveRetainMs)
  ));
  if (sessions.length === snapshot.sessions.length) return snapshot;

  const expiredCount = snapshot.sessions.length - sessions.length;
  return {
    ...snapshot,
    globalState: globalStateForSessions(sessions),
    activeSessionCount: activeSessionCount(sessions),
    sessions,
    diagnostics: [
      ...snapshot.diagnostics,
      {
        level: 'warning',
        message: `Expired ${expiredCount} stale or inactive CLI session${expiredCount === 1 ? '' : 's'}.`,
        createdAt: now.toISOString()
      }
    ]
  };
}

function isExpiredCliSession(
  session: CodexSession,
  nowMs: number,
  staleMs: number,
  inactiveRetainMs: number
): boolean {
  if (session.source !== 'cli') return false;
  const updatedAtMs = Date.parse(session.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;

  const ageMs = nowMs - updatedAtMs;
  if (staleMs > 0 && STALE_CLI_STATES.has(session.state)) {
    return ageMs > staleMs;
  }
  if (inactiveRetainMs > 0 && INACTIVE_CLI_STATES.has(session.state)) {
    return ageMs > inactiveRetainMs;
  }
  return false;
}

function activeSessionCount(sessions: CodexSession[]): number {
  return sessions.filter((session) => session.state !== 'idle').length;
}

function globalStateForSessions(sessions: CodexSession[]): CodexLightState {
  return sessions.reduce<CodexLightState>((winner, session) => (
    PRIORITY[session.state] > PRIORITY[winner] ? session.state : winner
  ), 'idle');
}

function chooseEffectiveEvent(events: CodexLightEvent[]): CodexLightEvent {
  return events.reduce((winner, event) => (
    event.createdAt >= winner.createdAt ? event : winner
  ), events[0]);
}

function stateForHook(hookEventName: string, payload: RawCodexHookPayload): CodexLightState {
  if (hookEventName === 'SessionStart') return 'idle';
  if (hookEventName === 'PermissionRequest') return 'waiting';
  if (hookEventName === 'PreToolUse' && isPermissionGatedTool(payload)) return 'waiting';
  if (hookEventName === 'Stop' || hookEventName === 'SessionEnd' || hookEventName === 'SubagentStop') {
    return 'completed';
  }
  if (hookEventName === 'HookError') return 'error';
  return 'running';
}

function actionForHook(hookEventName: string, payload: RawCodexHookPayload): string {
  if (hookEventName === 'PermissionRequest') {
    return `Waiting for approval${payload.tool_name ? `: ${payload.tool_name}` : ''}`;
  }
  if (hookEventName === 'PreToolUse' && isPermissionGatedTool(payload)) {
    return `Waiting for approval${payload.tool_name ? `: ${payload.tool_name}` : ''}`;
  }
  if (hookEventName === 'PreToolUse') return `Running ${payload.tool_name ?? 'tool'}`;
  if (hookEventName === 'PostToolUse') return `Finished ${payload.tool_name ?? 'tool'}`;
  if (hookEventName === 'Stop') return 'Turn completed';
  if (hookEventName === 'UserPromptSubmit') return 'Prompt submitted';
  if (hookEventName === 'SessionStart') return 'Session started';
  return hookEventName;
}

function projectNameFromCwd(cwd: string): string {
  return cwd.includes('\\') ? path.win32.basename(cwd) : path.basename(cwd);
}

function isPermissionGatedTool(payload: RawCodexHookPayload): boolean {
  const explicit = explicitApprovalRequired(payload);
  if (explicit !== undefined) return explicit;

  if (typeof payload.tool_name !== 'string') return false;
  return PERMISSION_GATED_TOOLS.has(normalizeToolName(payload.tool_name));
}

function explicitApprovalRequired(payload: RawCodexHookPayload): boolean | undefined {
  if (typeof payload.permission_mode === 'string' && normalizeToolName(payload.permission_mode) === 'bypasspermissions') {
    return false;
  }

  for (const field of APPROVAL_FLAG_FIELDS) {
    const value = payload[field];
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') continue;

    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'required') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'none') {
      return false;
    }
  }

  return undefined;
}

function normalizeToolName(toolName: string): string {
  return toolName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
