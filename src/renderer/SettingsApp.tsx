import { useEffect, useState } from 'react';
import type { CodexLightSettingsState, OverlayDisplayInfo } from '../main/ipc-types';
import type { OverlayAlignment, OverlayLanguage, OverlaySettings, OverlayTargetDisplayId } from '../main/overlay-settings';
import './styles.css';

const COPY: Record<OverlayLanguage, {
  unavailable: string;
  loading: string;
  title: string;
  saveError: string;
  language: string;
  position: string;
  display: string;
  primaryDisplay: string;
  primarySuffix: string;
  opacity: string;
  size: string;
  startOnLogin: string;
  trafficLightPreview: string;
  trafficLightPreviewLabel: string;
  alignments: Record<OverlayAlignment, string>;
}> = {
  'zh-CN': {
    unavailable: '设置暂不可用',
    loading: '正在载入设置...',
    title: 'Codex Light 设置',
    saveError: '设置保存失败',
    language: '语言',
    position: '位置',
    display: '显示器',
    primaryDisplay: '主显示器',
    primarySuffix: '（主）',
    opacity: '透明度',
    size: '尺寸',
    startOnLogin: '开机启动',
    trafficLightPreview: '允许预览红绿灯',
    trafficLightPreviewLabel: '红绿灯预览',
    alignments: {
      'top-center': '顶部居中',
      'top-left': '顶部左侧',
      'top-right': '顶部右侧'
    }
  },
  'en-US': {
    unavailable: 'Settings unavailable',
    loading: 'Loading settings...',
    title: 'Codex Light Settings',
    saveError: 'Failed to save settings',
    language: 'Language',
    position: 'Position',
    display: 'Display',
    primaryDisplay: 'Primary display',
    primarySuffix: ' (Primary)',
    opacity: 'Opacity',
    size: 'Size',
    startOnLogin: 'Start at login',
    trafficLightPreview: 'Allow traffic-light preview',
    trafficLightPreviewLabel: 'Traffic-light preview',
    alignments: {
      'top-center': 'Top center',
      'top-left': 'Top left',
      'top-right': 'Top right'
    }
  }
};

const ALIGNMENTS: OverlayAlignment[] = ['top-center', 'top-left', 'top-right'];
const LANGUAGES: OverlayLanguage[] = ['zh-CN', 'en-US'];

export function SettingsApp() {
  const [state, setState] = useState<CodexLightSettingsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const codexLight = window.codexLight;
  const language = state?.settings.language ?? 'zh-CN';
  const copy = COPY[language];

  useEffect(() => {
    if (!codexLight) return undefined;

    let mounted = true;

    codexLight.getSettings()
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError('设置暂不可用');
        }
      });

    const cleanup = codexLight.onSettingsChanged((nextState) => {
      setState(nextState);
      setLoadError(null);
      setSaveError(false);
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, [codexLight]);

  const updateSettings = (patch: SettingsPatch) => {
    if (!codexLight) return;

    const save = async () => {
      try {
        const nextState = await codexLight.updateSettings(patch);
        setState(nextState);
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    };

    save();
  };

  if (!codexLight || loadError) {
    return (
      <main className="settings-surface">
        <p className="settings-fallback">{loadError ?? copy.unavailable}</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="settings-surface">
        <p className="settings-fallback">{copy.loading}</p>
      </main>
    );
  }

  return (
    <main className="settings-surface">
      <header className="settings-header">
        <h1>{copy.title}</h1>
      </header>

      <form className="settings-form">
        {saveError && <p className="settings-error" role="alert">{copy.saveError}</p>}

        <label className="settings-field">
          <span>{copy.language}</span>
          <select
            value={state.settings.language}
            onChange={(event) => {
              updateSettings({ language: event.target.value as OverlayLanguage });
            }}
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {option === 'zh-CN' ? '中文' : 'English'}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>{copy.position}</span>
          <select
            value={state.settings.alignment}
            onChange={(event) => {
              updateSettings({ alignment: event.target.value as OverlayAlignment });
            }}
          >
            {ALIGNMENTS.map((alignment) => (
              <option key={alignment} value={alignment}>
                {copy.alignments[alignment]}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>{copy.display}</span>
          <select
            value={String(state.settings.targetDisplayId)}
            onChange={(event) => {
              updateSettings({ targetDisplayId: displayValueFromSelect(event.target.value) });
            }}
          >
            <option value="primary">{copy.primaryDisplay}</option>
            {state.displays.map((display) => (
              <option key={display.id} value={display.id}>
                {displayLabel(display, copy.primarySuffix)}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field settings-range">
          <span>{copy.opacity}</span>
          <input
            type="range"
            min="72"
            max="100"
            step="1"
            value={percentValue(state.settings.opacity)}
            onChange={(event) => {
              updateSettings({ opacity: Number(event.target.value) / 100 });
            }}
          />
          <output>{percentValue(state.settings.opacity)}%</output>
        </label>

        <label className="settings-field settings-range">
          <span>{copy.size}</span>
          <input
            type="range"
            min="85"
            max="125"
            step="1"
            value={percentValue(state.settings.sizeScale)}
            onChange={(event) => {
              updateSettings({ sizeScale: Number(event.target.value) / 100 });
            }}
          />
          <output>{percentValue(state.settings.sizeScale)}%</output>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={state.settings.startOnLogin}
            onChange={(event) => {
              updateSettings({ startOnLogin: event.target.checked });
            }}
          />
          <span>{copy.startOnLogin}</span>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={state.settings.trafficLightPreviewEnabled}
            onChange={(event) => {
              updateSettings({ trafficLightPreviewEnabled: event.target.checked });
            }}
          />
          <span>{copy.trafficLightPreview}</span>
        </label>

        {state.settings.trafficLightPreviewEnabled && (
          <section className="settings-preview" aria-label={copy.trafficLightPreviewLabel}>
            <div className="settings-preview-island">
              <span className="settings-preview-dot" aria-hidden="true" />
              <strong>codex-light</strong>
            </div>
          </section>
        )}
      </form>
    </main>
  );
}

type SettingsPatch = Pick<
  Partial<OverlaySettings>,
  | 'alignment'
  | 'targetDisplayId'
  | 'opacity'
  | 'sizeScale'
  | 'startOnLogin'
  | 'trafficLightPreviewEnabled'
  | 'language'
>;

function displayValueFromSelect(value: string): OverlayTargetDisplayId {
  return value === 'primary' ? value : Number(value);
}

function displayLabel(display: OverlayDisplayInfo, primarySuffix: string): string {
  return display.isPrimary ? `${display.label}${primarySuffix}` : display.label;
}

function percentValue(value: number): number {
  return Math.round(value * 100);
}
