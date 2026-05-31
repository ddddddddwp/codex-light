import type { CodexLightSnapshot, CodexLightState } from '../core/types';

export function demoSnapshotFromLocation(location: Location): CodexLightSnapshot | undefined {
  const state = new URLSearchParams(location.search).get('demoState');
  if (!isDemoState(state)) return undefined;

  return {
    version: 1,
    generatedAt: '2026-05-31T00:00:00.000Z',
    globalState: state,
    activeSessionCount: state === 'idle' ? 0 : 1,
    sessions: state === 'idle' ? [] : [
      {
        sessionId: `demo-${state}`,
        source: state === 'running' ? 'cli' : 'desktop-fallback',
        state,
        cwd: 'C:\\code\\codex-light',
        projectName: 'codex-light',
        model: 'gpt-5.5',
        action: demoAction(state),
        startedAt: '2026-05-31T00:00:00.000Z',
        updatedAt: '2026-05-31T00:00:04.000Z',
        fallbackReason: state === 'waiting' ? 'process presence' : undefined
      }
    ],
    diagnostics: []
  };
}

function isDemoState(state: string | null): state is CodexLightState {
  return state === 'idle' || state === 'running' || state === 'waiting' || state === 'completed' || state === 'error';
}

function demoAction(state: CodexLightState): string {
  if (state === 'running') return 'Running Bash';
  if (state === 'waiting') return 'Waiting for approval: Bash';
  if (state === 'completed') return 'Turn completed';
  if (state === 'error') return 'Hook error';
  return 'Idle';
}
