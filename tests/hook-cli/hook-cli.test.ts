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
});
