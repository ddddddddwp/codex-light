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

    const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'state.json'), 'utf8')) as { globalState: string };
    expect(snapshot.globalState).toBe('running');
  });

  it('uses independent temporary files for concurrent snapshot writes', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-concurrent-'));
    const writes = Array.from({ length: 40 }, (_, index) => writeSnapshotAtomic(dir, {
      version: 1,
      generatedAt: `2026-05-31T00:00:${String(index).padStart(2, '0')}.000Z`,
      globalState: index % 2 === 0 ? 'running' : 'waiting',
      activeSessionCount: 1,
      sessions: [],
      diagnostics: []
    }));

    const results = await Promise.allSettled(writes);

    expect(results).toEqual(results.map(() => expect.objectContaining({ status: 'fulfilled' })));
    expect(await fs.readdir(dir)).not.toContain('state.json.tmp');
    await expect(fs.readFile(path.join(dir, 'state.json'), 'utf8')).resolves.toContain('"version": 1');
  });
});
