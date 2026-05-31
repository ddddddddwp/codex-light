import { describe, expect, it, vi } from 'vitest';
import type { CodexLightSnapshot } from '../../src/core/types';
import { expireStaleCliSessions } from '../../src/core/normalize';
import { createSnapshotSync } from '../../src/main/snapshot-sync';

const baseSnapshot: CodexLightSnapshot = {
  version: 1,
  generatedAt: '2026-05-31T00:00:00.000Z',
  globalState: 'running',
  activeSessionCount: 1,
  sessions: [{
    sessionId: 'session-1',
    source: 'cli',
    state: 'running',
    startedAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z'
  }],
  diagnostics: []
};

describe('createSnapshotSync', () => {
  it('publishes snapshots changed by polling even when no filesystem event arrives', async () => {
    const snapshots = [
      baseSnapshot,
      { ...baseSnapshot, generatedAt: '2026-05-31T00:00:01.000Z', globalState: 'waiting' as const }
    ];
    const publish = vi.fn();
    const sync = createSnapshotSync({
      read: async () => snapshots.shift() ?? null,
      publish
    });

    await sync.pollOnce();
    await sync.pollOnce();

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].globalState).toBe('waiting');
  });

  it('does not republish identical snapshots on repeated polls', async () => {
    const publish = vi.fn();
    const sync = createSnapshotSync({
      read: async () => baseSnapshot,
      publish
    });

    await sync.pollOnce();
    await sync.pollOnce();

    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('starts an interval so WSL writes are detected without chokidar events', () => {
    const setIntervalFn = vi.fn();
    const sync = createSnapshotSync({
      read: async () => null,
      publish: vi.fn(),
      setIntervalFn,
      intervalMs: 1_000
    });

    sync.startPolling();

    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 1_000);
  });

  it('publishes an idle snapshot when an unchanged CLI snapshot becomes stale', async () => {
    let now = new Date('2026-05-31T00:00:30.000Z');
    const publish = vi.fn();
    const sync = createSnapshotSync({
      read: async () => expireStaleCliSessions(baseSnapshot, now, 60_000),
      publish
    });

    await sync.pollOnce();
    now = new Date('2026-05-31T00:01:01.000Z');
    await sync.pollOnce();

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].globalState).toBe('idle');
    expect(publish.mock.calls[1][0].sessions).toEqual([]);
  });
});
