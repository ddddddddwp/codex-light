import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CodexLightSnapshot } from '../../src/core/types';
import { App } from '../../src/renderer/App';

const snapshot: CodexLightSnapshot = {
  version: 1,
  generatedAt: '2026-05-31T00:00:00.000Z',
  globalState: 'waiting',
  activeSessionCount: 1,
  sessions: [
    {
      sessionId: 'session-1',
      source: 'cli',
      state: 'waiting',
      cwd: 'C:\\code\\demo',
      projectName: 'demo',
      model: 'gpt-5.5',
      action: 'Waiting for approval: Bash',
      startedAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:02.000Z'
    }
  ],
  diagnostics: []
};

describe('App', () => {
  it('renders waiting island details', () => {
    render(<App initialSnapshot={snapshot} initialExpanded />);

    expect(screen.getByText('等待确认')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('Waiting for approval: Bash')).toBeInTheDocument();
  });
});
