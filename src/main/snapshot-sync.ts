import type { CodexLightSnapshot } from '../core/types';

type SnapshotReader = () => Promise<CodexLightSnapshot | null>;
type SnapshotPublisher = (snapshot: CodexLightSnapshot) => void;
type SetIntervalFn = (callback: () => void, ms: number) => unknown;

interface SnapshotSyncOptions {
  read: SnapshotReader;
  publish: SnapshotPublisher;
  intervalMs?: number;
  setIntervalFn?: SetIntervalFn;
}

export interface SnapshotSync {
  pollOnce(): Promise<void>;
  startPolling(): unknown;
}

export function createSnapshotSync({
  read,
  publish,
  intervalMs = 1_000,
  setIntervalFn = setInterval
}: SnapshotSyncOptions): SnapshotSync {
  let lastSignature: string | null = null;

  async function pollOnce(): Promise<void> {
    const snapshot = await read();
    if (!snapshot) return;

    const signature = snapshotSignature(snapshot);
    if (signature === lastSignature) return;

    lastSignature = signature;
    publish(snapshot);
  }

  return {
    pollOnce,
    startPolling: () => setIntervalFn(() => void pollOnce(), intervalMs)
  };
}

function snapshotSignature(snapshot: CodexLightSnapshot): string {
  return JSON.stringify({
    generatedAt: snapshot.generatedAt,
    globalState: snapshot.globalState,
    activeSessionCount: snapshot.activeSessionCount,
    sessions: snapshot.sessions.map((session) => ({
      sessionId: session.sessionId,
      state: session.state,
      action: session.action,
      updatedAt: session.updatedAt
    }))
  });
}
