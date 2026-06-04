import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleHookInput } from '../../src/hook-cli/index';

afterEach(() => {
  vi.useRealTimers();
});

describe('handleHookInput', () => {
  it('writes snapshot from valid stdin JSON', async () => {
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-'));
    const exitCode = await handleHookInput(JSON.stringify({
      hook_event_name: 'SessionStart',
      session_id: 'session-cli',
      cwd: 'C:\\code\\demo',
      model: 'gpt-5.5'
    }), runtimeDir);

    expect(exitCode).toBe(0);
    const snapshot = JSON.parse(await fs.readFile(path.join(runtimeDir, 'state.json'), 'utf8')) as {
      globalState: string;
    };
    expect(snapshot.globalState).toBe('idle');
  });

  it('returns non-zero for invalid JSON', async () => {
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-'));
    const exitCode = await handleHookInput('{bad json', runtimeDir);

    expect(exitCode).toBe(1);
  });

  it('keeps concurrent hook writes best-effort successful', async () => {
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-concurrent-'));
    const exitCodes = await Promise.all(Array.from({ length: 20 }, (_, index) => handleHookInput(JSON.stringify({
      hook_event_name: 'PreToolUse',
      session_id: 'session-cli',
      cwd: 'C:\\code\\demo',
      model: 'gpt-5.5',
      tool_name: 'Bash',
      turn_id: `turn-${index}`
    }), runtimeDir)));

    expect(exitCodes).toEqual(exitCodes.map(() => 0));
    await expect(fs.readFile(path.join(runtimeDir, 'state.json'), 'utf8')).resolves.toContain('"version": 1');
  });

  it('removes completed CLI sessions from persisted snapshots after 15 seconds', async () => {
    vi.useFakeTimers();
    const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-cli-expiry-'));

    vi.setSystemTime(new Date('2026-05-31T00:00:00.000Z'));
    await handleHookInput(JSON.stringify({
      hook_event_name: 'Stop',
      session_id: 'session-old',
      cwd: 'C:\\code\\old',
      model: 'gpt-5.5'
    }), runtimeDir);

    vi.setSystemTime(new Date('2026-05-31T00:00:15.001Z'));
    const exitCode = await handleHookInput(JSON.stringify({
      hook_event_name: 'SessionStart',
      session_id: 'session-new',
      cwd: 'C:\\code\\new',
      model: 'gpt-5.5'
    }), runtimeDir);

    expect(exitCode).toBe(0);
    const snapshot = JSON.parse(await fs.readFile(path.join(runtimeDir, 'state.json'), 'utf8')) as {
      sessions: Array<{ sessionId: string }>;
    };
    expect(snapshot.sessions.map((session) => session.sessionId)).toEqual(['session-new']);
  });
});
