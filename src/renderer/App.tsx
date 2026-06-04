import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CodexLightSnapshot, CodexSession } from '../core/types';
import type { OverlayLanguage, OverlaySettings } from '../main/overlay-settings';
import './styles.css';

const EMPTY: CodexLightSnapshot = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  globalState: 'idle',
  activeSessionCount: 0,
  sessions: [],
  diagnostics: []
};

const MAX_DISPLAY_SESSIONS = 10;
const ALWAYS_ENGLISH_IDLE = 'No active sessions';
const STATE_WEIGHT: Record<CodexSession['state'], number> = {
  waiting: 5,
  running: 4,
  error: 3,
  completed: 2,
  idle: 1
};

const COPY: Record<OverlayLanguage, {
  idle: string;
  summaryLabel: string;
  detailsLabel: string;
  metadataLabel: string;
  action: string;
  model: string;
  cwd: string;
  elapsed: string;
  source: string;
  state: string;
  sessions: string;
  unreportedAction: string;
  unknownModel: string;
  unknownCwd: string;
  unknownElapsed: string;
  sessionCount: (count: number) => string;
}> = {
  'zh-CN': {
    idle: '暂无活动会话',
    summaryLabel: 'Codex 状态摘要',
    detailsLabel: 'Codex 会话详情',
    metadataLabel: '会话元数据',
    action: '动作',
    model: '模型',
    cwd: '工作目录',
    elapsed: '耗时',
    source: '来源',
    state: '状态',
    sessions: '会话',
    unreportedAction: '未报告动作',
    unknownModel: '未知模型',
    unknownCwd: '未知工作目录',
    unknownElapsed: '未知',
    sessionCount: (count) => `${count} 个会话`
  },
  'en-US': {
    idle: 'No active sessions',
    summaryLabel: 'Codex status summary',
    detailsLabel: 'Codex session details',
    metadataLabel: 'Session metadata',
    action: 'Action',
    model: 'Model',
    cwd: 'Working directory',
    elapsed: 'Elapsed',
    source: 'Source',
    state: 'State',
    sessions: 'Sessions',
    unreportedAction: 'No reported action',
    unknownModel: 'Unknown model',
    unknownCwd: 'Unknown working directory',
    unknownElapsed: 'Unknown',
    sessionCount: (count) => count === 1 ? '1 session' : `${count} sessions`
  }
};

interface AppProps {
  initialSnapshot?: CodexLightSnapshot;
  initialExpanded?: boolean;
  initialNow?: Date;
}

type IslandStyle = CSSProperties & {
  '--island-scale': string;
};

export function App({ initialSnapshot = EMPTY, initialExpanded = false, initialNow }: AppProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [now, setNow] = useState(() => initialNow ?? new Date());
  const [language, setLanguage] = useState<OverlayLanguage>('zh-CN');
  const [sizeScale, setSizeScale] = useState(1);
  const [trafficLightPreviewEnabled, setTrafficLightPreviewEnabled] = useState(true);
  const expansionRequestId = useRef(0);
  const displaySessions = useMemo(() => getDisplaySessions(snapshot.sessions), [snapshot.sessions]);
  const primary = displaySessions[0];
  const copy = COPY[language];
  const islandStyle: IslandStyle = { '--island-scale': String(sizeScale) };

  useEffect(() => {
    if (!window.codexLight) return undefined;
    return window.codexLight.onSnapshot(setSnapshot);
  }, []);

  useEffect(() => {
    if (!window.codexLight) return undefined;

    let mounted = true;
    const applyOverlaySettings = (settings: OverlaySettings) => {
      setLanguage(settings.language);
      setSizeScale(settings.sizeScale);
      setTrafficLightPreviewEnabled(settings.trafficLightPreviewEnabled !== false);

      if (settings.trafficLightPreviewEnabled === false) {
        expansionRequestId.current += 1;
        setExpanded(false);
        void window.codexLight?.setPinnedExpanded(false).catch(() => undefined);
      }
    };

    window.codexLight.getSettings()
      .then((state) => {
        if (mounted) {
          applyOverlaySettings(state.settings);
        }
      })
      .catch(() => undefined);

    const cleanup = window.codexLight.onSettingsChanged((state) => {
      applyOverlaySettings(state.settings);
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

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
    return primary ? sessionDisplayName(primary) : ALWAYS_ENGLISH_IDLE;
  }, [primary]);

  const expandIsland = () => {
    if (!trafficLightPreviewEnabled) return;

    const requestId = ++expansionRequestId.current;
    setNow(new Date());

    if (!window.codexLight) {
      setExpanded(true);
      return;
    }

    void window.codexLight.setPinnedExpanded(true)
      .catch(() => undefined)
      .then(() => {
        if (expansionRequestId.current === requestId) {
          setExpanded(true);
        }
      });
  };

  const collapseIsland = () => {
    expansionRequestId.current += 1;
    setExpanded(false);
    void window.codexLight?.setPinnedExpanded(false).catch(() => undefined);
  };

  const toggleExpanded = () => {
    if (expanded) collapseIsland();
    else expandIsland();
  };

  return (
    <main
      className={`island state-${snapshot.globalState} ${expanded ? 'expanded' : 'compact'}`}
      style={islandStyle}
      onMouseEnter={expandIsland}
      onMouseLeave={collapseIsland}
      onClick={toggleExpanded}
    >
      <div className="island-body">
        <section className="summary" aria-label={copy.summaryLabel}>
          <div className="status-lights" aria-hidden={displaySessions.length === 0}>
            {displaySessions.length === 0 ? (
              <span className="status-dot" aria-hidden="true" />
            ) : displaySessions.map((session) => (
              <span
                key={session.sessionId}
                className={`session-light state-${session.state}`}
                data-testid="session-light"
                title={`${sessionDisplayName(session)}: ${session.state}`}
              />
            ))}
          </div>
          <div className="summary-text">
            <strong>{compactLabel}</strong>
          </div>
          {snapshot.activeSessionCount > 1 && <span className="count">{snapshot.activeSessionCount}</span>}
        </section>

        {expanded && (
          <section className="details" aria-label={copy.detailsLabel}>
            {displaySessions.length === 0 ? (
              <p>{ALWAYS_ENGLISH_IDLE}</p>
            ) : (
              displaySessions.map((session) => (
                <article key={session.sessionId} className="session">
                  <div className="session-primary">
                    <strong className="session-title">{sessionDisplayName(session)}</strong>
                    <span className="session-action">
                      <span className="session-label">{copy.action}</span>
                      <span className="session-value">{session.action ?? copy.unreportedAction}</span>
                    </span>
                  </div>
                  <div className="session-meta" aria-label={copy.metadataLabel}>
                    <span className="meta-item meta-model">
                      <span className="meta-label">{copy.model}</span>
                      <span className="meta-value">{session.model ?? copy.unknownModel}</span>
                    </span>
                    <span className="meta-item meta-cwd">
                      <span className="meta-label">{copy.cwd}</span>
                      <span className="meta-value">{session.cwd ?? copy.unknownCwd}</span>
                    </span>
                    <span className="meta-item meta-elapsed">
                      <span className="meta-label">{copy.elapsed}</span>
                      <span className="meta-value">{formatElapsed(session, now, copy.unknownElapsed)}</span>
                    </span>
                    <span className="meta-item meta-source">
                      <span className="meta-label">{copy.source}</span>
                      <span className="meta-value">{session.source}</span>
                    </span>
                    <span className="meta-item meta-state">
                      <span className="meta-label">{copy.state}</span>
                      <span className="meta-value">{session.state}</span>
                    </span>
                    <span className="meta-item meta-count">
                      <span className="meta-label">{copy.sessions}</span>
                      <span className="meta-value">{copy.sessionCount(snapshot.activeSessionCount)}</span>
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function getDisplaySessions(sessions: CodexSession[]): CodexSession[] {
  return [...sessions].sort(compareDisplaySessions).slice(0, MAX_DISPLAY_SESSIONS);
}

function compareDisplaySessions(a: CodexSession, b: CodexSession): number {
  const aActive = isActiveSession(a) ? 1 : 0;
  const bActive = isActiveSession(b) ? 1 : 0;
  if (aActive !== bActive) return bActive - aActive;

  const stateDiff = STATE_WEIGHT[b.state] - STATE_WEIGHT[a.state];
  if (stateDiff !== 0) return stateDiff;

  const updatedDiff = timestampForSort(b.updatedAt) - timestampForSort(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return a.sessionId.localeCompare(b.sessionId);
}

function isActiveSession(session: CodexSession): boolean {
  return session.state !== 'idle';
}

function timestampForSort(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sessionDisplayName(session: CodexSession): string {
  return session.projectName ?? session.sessionId;
}

function formatElapsed(session: CodexSession, now: Date, unknownLabel: string): string {
  const startedAt = Date.parse(session.startedAt);
  const endedAt = session.state === 'completed' ? Date.parse(session.updatedAt) : now.getTime();

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return unknownLabel;

  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}
