import { useEffect, useMemo, useState } from 'react';
import type { CodexLightSnapshot, CodexSession } from '../core/types';
import './styles.css';

const EMPTY: CodexLightSnapshot = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  globalState: 'idle',
  activeSessionCount: 0,
  sessions: [],
  diagnostics: []
};

const IDLE_LABEL = '暂无活动会话';

interface AppProps {
  initialSnapshot?: CodexLightSnapshot;
  initialExpanded?: boolean;
  initialNow?: Date;
}

export function App({ initialSnapshot = EMPTY, initialExpanded = false, initialNow }: AppProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [now, setNow] = useState(() => initialNow ?? new Date());
  const primary = snapshot.sessions[0];

  useEffect(() => {
    if (!window.codexLight) return undefined;
    return window.codexLight.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    window.codexLight?.setPinnedExpanded(expanded);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expanded]);

  const compactLabel = useMemo(() => {
    return primary?.projectName ?? IDLE_LABEL;
  }, [primary]);

  const expandIsland = () => {
    setNow(new Date());
    setExpanded(true);
  };

  const toggleExpanded = () => {
    if (!expanded) {
      setNow(new Date());
    }

    setExpanded((value) => !value);
  };

  return (
    <main
      className={`island state-${snapshot.globalState} ${expanded ? 'expanded' : 'compact'}`}
      onMouseEnter={expandIsland}
      onMouseLeave={() => setExpanded(false)}
      onClick={toggleExpanded}
    >
      <section className="summary" aria-label="Codex status summary">
        <span className="status-dot" aria-hidden="true" />
        <div className="summary-text">
          <strong>{compactLabel}</strong>
        </div>
        {snapshot.activeSessionCount > 1 && <span className="count">{snapshot.activeSessionCount}</span>}
      </section>

      {expanded && (
        <section className="details" aria-label="Codex session details">
          {snapshot.sessions.length === 0 ? (
            <p>{IDLE_LABEL}</p>
          ) : snapshot.sessions.map((session) => (
            <article key={session.sessionId} className="session">
              <div className="session-primary">
                <strong className="session-title">{session.projectName ?? session.sessionId}</strong>
                <span className="session-action">
                  <span className="session-label">动作</span>
                  <span className="session-value">{session.action ?? '未报告动作'}</span>
                </span>
              </div>
              <div className="session-meta" aria-label="会话元数据">
                <span className="meta-item meta-model">
                  <span className="meta-label">模型</span>
                  <span className="meta-value">{session.model ?? '未知模型'}</span>
                </span>
                <span className="meta-item meta-cwd">
                  <span className="meta-label">工作目录</span>
                  <span className="meta-value">{session.cwd ?? '未知工作目录'}</span>
                </span>
                <span className="meta-item meta-elapsed">
                  <span className="meta-label">耗时</span>
                  <span className="meta-value">{formatElapsed(session, now)}</span>
                </span>
                <span className="meta-item meta-source">
                  <span className="meta-label">来源</span>
                  <span className="meta-value">{session.source}</span>
                </span>
                <span className="meta-item meta-count">
                  <span className="meta-label">会话</span>
                  <span className="meta-value">{formatSessionCount(snapshot.activeSessionCount)}</span>
                </span>
              </div>
              {session.fallbackReason && <small>{session.fallbackReason}</small>}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function formatSessionCount(count: number): string {
  return `${count} 个会话`;
}

function formatElapsed(session: CodexSession, now: Date): string {
  const startedAt = Date.parse(session.startedAt);
  const endedAt = session.state === 'completed' ? Date.parse(session.updatedAt) : now.getTime();

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return '未知';

  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}
