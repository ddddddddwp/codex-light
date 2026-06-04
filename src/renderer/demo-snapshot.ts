import type { CodexLightSnapshot, CodexLightState } from '../core/types';

export function demoSnapshotFromLocation(location: Location): CodexLightSnapshot | undefined {
  const state = new URLSearchParams(location.search).get('demoState');
  if (state === 'multi') return multiDemoSnapshot();
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

function multiDemoSnapshot(): CodexLightSnapshot {
  const sessions = Array.from({ length: 10 }, (_, index) => {
    const state: CodexLightState = index === 0 ? 'waiting' : index % 3 === 0 ? 'completed' : 'running';

    return {
      sessionId: `demo-multi-${index + 1}`,
      source: 'cli' as const,
      state,
      cwd: `C:\\code\\project-${index + 1}`,
      projectName: `project-${index + 1}`,
      model: 'gpt-5.5',
      action: index === 0 ? 'Waiting for approval: Bash' : `Running task ${index + 1}`,
      startedAt: '2026-05-31T00:00:00.000Z',
      updatedAt: `2026-05-31T00:00:${String(index + 1).padStart(2, '0')}.000Z`
    };
  });

  return {
    version: 1,
    generatedAt: '2026-05-31T00:00:00.000Z',
    globalState: 'waiting',
    activeSessionCount: sessions.filter((session) => session.state !== 'idle').length,
    sessions,
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
