import { describe, expect, it } from 'vitest';
import sessionStart from '../fixtures/session-start.json';
import permissionRequest from '../fixtures/permission-request.json';
import stop from '../fixtures/stop.json';
import { aggregateSessions, normalizeHookPayload } from '../../src/core/normalize';

describe('normalizeHookPayload', () => {
  it('maps Codex hook events to the requested traffic-light states', () => {
    const cases = [
      {
        name: 'SessionStart',
        payload: sessionStart,
        state: 'idle',
        action: 'Session started'
      },
      {
        name: 'UserPromptSubmit',
        payload: {
          ...sessionStart,
          hook_event_name: 'UserPromptSubmit',
          turn_id: 'turn-1'
        },
        state: 'running',
        action: 'Prompt submitted'
      },
      {
        name: 'PreToolUse for a permission-gated tool',
        payload: {
          ...sessionStart,
          hook_event_name: 'PreToolUse',
          turn_id: 'turn-1',
          tool_name: 'Bash'
        },
        state: 'waiting',
        action: 'Waiting for approval: Bash'
      },
      {
        name: 'PostToolUse for a permission-gated tool',
        payload: {
          ...sessionStart,
          hook_event_name: 'PostToolUse',
          turn_id: 'turn-1',
          tool_name: 'Bash'
        },
        state: 'running',
        action: 'Finished Bash'
      },
      {
        name: 'Stop',
        payload: stop,
        state: 'completed',
        action: 'Turn completed'
      }
    ] as const;

    for (const { name, payload, state, action } of cases) {
      const event = normalizeHookPayload(payload);

      expect(event.state, name).toBe(state);
      expect(event.action, name).toBe(action);
    }
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
    const running = normalizeHookPayload(sessionStart, new Date('2026-05-31T00:00:00.000Z'));
    const waiting = normalizeHookPayload(permissionRequest, new Date('2026-05-31T00:00:01.000Z'));
    const snapshot = aggregateSessions([running, waiting], new Date('2026-05-31T00:00:03.000Z'));

    expect(snapshot.globalState).toBe('waiting');
    expect(snapshot.activeSessionCount).toBe(1);
  });
});
