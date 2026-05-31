import { useEffect, useMemo, useState } from 'react';
import type { CodexLightSnapshot } from '../core/types';
import { STATE_LABEL } from './state-labels';
import './styles.css';

const EMPTY: CodexLightSnapshot = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  globalState: 'idle',
  activeSessionCount: 0,
  sessions: [],
  diagnostics: []
};

interface AppProps {
  initialSnapshot?: CodexLightSnapshot;
  initialExpanded?: boolean;
}

export function App({ initialSnapshot = EMPTY, initialExpanded = false }: AppProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [expanded, setExpanded] = useState(initialExpanded);
  const primary = snapshot.sessions[0];

  useEffect(() => {
    if (!window.codexLight) return undefined;
    return window.codexLight.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    window.codexLight?.setPinnedExpanded(expanded);
  }, [expanded]);

  const subtitle = useMemo(() => {
    if (!primary) return '等待 Codex 活动';
    return [primary.projectName, primary.source.toUpperCase(), primary.model].filter(Boolean).join(' · ');
  }, [primary]);

  return (
    <main
      className={`island state-${snapshot.globalState} ${expanded ? 'expanded' : 'compact'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded((value) => !value)}
    >
      <section className="summary" aria-label="Codex status summary">
        <span className="status-dot" aria-hidden="true" />
        <div className="summary-text">
          <strong>{STATE_LABEL[snapshot.globalState]}</strong>
          <span>{subtitle}</span>
        </div>
        {snapshot.activeSessionCount > 1 && <span className="count">{snapshot.activeSessionCount}</span>}
      </section>

      {expanded && (
        <section className="details" aria-label="Codex session details">
          {snapshot.sessions.length === 0 ? (
            <p>暂无活动会话</p>
          ) : snapshot.sessions.map((session) => (
            <article key={session.sessionId} className="session">
              <div>
                <strong>{session.projectName ?? session.cwd ?? session.sessionId}</strong>
                <span>{session.action ?? STATE_LABEL[session.state]}</span>
              </div>
              <small>{session.source}{session.fallbackReason ? ` · ${session.fallbackReason}` : ''}</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
