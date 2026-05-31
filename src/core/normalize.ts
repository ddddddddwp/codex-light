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
