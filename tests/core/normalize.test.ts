import { describe, expect, it } from 'vitest';
import sessionStart from '../fixtures/session-start.json';
import permissionRequest from '../fixtures/permission-request.json';
import stop from '../fixtures/stop.json';
import { aggregateSessions, normalizeHookPayload } from '../../src/core/normalize';

describe('normalizeHookPayload', () => {
  it('maps SessionStart to idle so the island stays red until a prompt is submitted', () => {
    const event = normalizeHookPayload(sessionStart);

    expect(event.state).toBe('idle');
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
    const running = normalizeHookPayload(sessionStart, new Date('2026-05-31T00:00:00.000Z'));
    const waiting = normalizeHookPayload(permissionRequest, new Date('2026-05-31T00:00:01.000Z'));
    const snapshot = aggregateSessions([running, waiting], new Date('2026-05-31T00:00:03.000Z'));

    expect(snapshot.globalState).toBe('waiting');
    expect(snapshot.activeSessionCount).toBe(1);
  });
});
