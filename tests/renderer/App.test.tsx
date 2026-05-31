import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('renders compact project label without expanded metadata', () => {
    render(<App initialSnapshot={snapshot} initialExpanded={false} />);

    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.queryByText('等待确认')).not.toBeInTheDocument();
    expect(screen.queryByText('gpt-5.5')).not.toBeInTheDocument();
    expect(screen.queryByText('C:\\code\\demo')).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for approval: Bash')).not.toBeInTheDocument();
  });

  it('renders compact multi-session count', () => {
    render(
      <App
        initialSnapshot={{
          ...snapshot,
          activeSessionCount: 3
        }}
        initialExpanded={false}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders expanded session metadata with elapsed time', () => {
    render(
      <App
        initialSnapshot={snapshot}
        initialExpanded
        initialNow={new Date('2026-05-31T00:00:05.000Z')}
      />
    );

    expect(screen.getByText('Waiting for approval: Bash')).toBeInTheDocument();
    expect(screen.getByText('动作')).toBeInTheDocument();
    expect(screen.getByText('模型')).toBeInTheDocument();
    expect(screen.getByText('工作目录')).toBeInTheDocument();
    expect(screen.getByText('耗时')).toBeInTheDocument();
    expect(screen.getByText('来源')).toBeInTheDocument();
    expect(screen.getByText('会话')).toBeInTheDocument();
    expect(screen.getByText('gpt-5.5')).toBeInTheDocument();
    expect(screen.getByText('C:\\code\\demo')).toBeInTheDocument();
    expect(screen.getByText('cli')).toBeInTheDocument();
    expect(screen.getByText('1 个会话')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
    expect(screen.queryByText('2s')).not.toBeInTheDocument();
  });

  it('updates active elapsed time while expanded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:05.000Z'));

    render(<App initialSnapshot={snapshot} initialExpanded initialNow={new Date('2026-05-31T00:00:05.000Z')} />);

    expect(screen.getByText('5s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('6s')).toBeInTheDocument();
    expect(screen.queryByText('5s')).not.toBeInTheDocument();
  });

  it('refreshes elapsed immediately when expanding from compact', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:05.000Z'));

    render(<App initialSnapshot={snapshot} initialExpanded={false} initialNow={new Date('2026-05-31T00:00:05.000Z')} />);

    expect(screen.queryByText('5s')).not.toBeInTheDocument();

    vi.setSystemTime(new Date('2026-05-31T00:00:08.000Z'));
    fireEvent.click(screen.getByRole('main'));

    expect(screen.getByText('8s')).toBeInTheDocument();
    expect(screen.queryByText('5s')).not.toBeInTheDocument();
  });

  it('uses updatedAt for completed session elapsed time', () => {
    render(
      <App
        initialSnapshot={{
          ...snapshot,
          globalState: 'completed',
          sessions: [
            {
              ...snapshot.sessions[0],
              state: 'completed',
              updatedAt: '2026-05-31T00:00:04.000Z'
            }
          ]
        }}
        initialExpanded
        initialNow={new Date('2026-05-31T00:00:30.000Z')}
      />
    );

    expect(screen.getByText('4s')).toBeInTheDocument();
    expect(screen.queryByText('30s')).not.toBeInTheDocument();
  });

  it('keeps completed elapsed time fixed while expanded time ticks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:30.000Z'));

    render(
      <App
        initialSnapshot={{
          ...snapshot,
          globalState: 'completed',
          sessions: [
            {
              ...snapshot.sessions[0],
              state: 'completed',
              updatedAt: '2026-05-31T00:00:04.000Z'
            }
          ]
        }}
        initialExpanded
        initialNow={new Date('2026-05-31T00:00:30.000Z')}
      />
    );

    expect(screen.getByText('4s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('4s')).toBeInTheDocument();
    expect(screen.queryByText('31s')).not.toBeInTheDocument();
  });

  it('renders clear fallbacks when session metadata is missing', () => {
    render(
      <App
        initialSnapshot={{
          ...snapshot,
          globalState: 'running',
          sessions: [
            {
              sessionId: 'session-without-metadata',
              source: 'desktop-fallback',
              state: 'running',
              startedAt: '2026-05-31T00:00:00.000Z',
              updatedAt: '2026-05-31T00:00:03.000Z'
            }
          ]
        }}
        initialExpanded
        initialNow={new Date('2026-05-31T00:00:05.000Z')}
      />
    );

    expect(screen.getByText('session-without-metadata')).toBeInTheDocument();
    expect(screen.getByText('未报告动作')).toBeInTheDocument();
    expect(screen.getByText('未知模型')).toBeInTheDocument();
    expect(screen.getByText('未知工作目录')).toBeInTheDocument();
  });

  it('renders localized idle fallback', () => {
    render(
      <App
        initialSnapshot={{
          ...snapshot,
          globalState: 'idle',
          activeSessionCount: 0,
          sessions: []
        }}
        initialExpanded
      />
    );

    expect(screen.getAllByText('暂无活动会话')).toHaveLength(2);
  });
});
