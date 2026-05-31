import { useEffect, useState } from 'react';
import type { CodexLightSettingsState, OverlayDisplayInfo } from '../main/ipc-types';
import type { OverlayAlignment, OverlaySettings, OverlayTargetDisplayId } from '../main/overlay-settings';
import './styles.css';

const ALIGNMENT_LABELS: Record<OverlayAlignment, string> = {
  'top-center': '顶部居中',
  'top-left': '顶部左侧',
  'top-right': '顶部右侧'
};

const ALIGNMENTS = Object.keys(ALIGNMENT_LABELS) as OverlayAlignment[];

export function SettingsApp() {
  const [state, setState] = useState<CodexLightSettingsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const codexLight = window.codexLight;

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
      setSaveError(null);
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
        setSaveError(null);
      } catch {
        setSaveError('设置保存失败');
      }
    };

    save();
  };

  if (!codexLight || loadError) {
    return (
      <main className="settings-surface">
        <p className="settings-fallback">{loadError ?? '设置暂不可用'}</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="settings-surface">
        <p className="settings-fallback">正在载入设置...</p>
      </main>
    );
  }

  return (
    <main className="settings-surface">
      <header className="settings-header">
        <h1>Codex Light 设置</h1>
      </header>

      <form className="settings-form">
        {saveError && <p className="settings-error" role="alert">{saveError}</p>}

        <label className="settings-field">
          <span>位置</span>
          <select
            value={state.settings.alignment}
            onChange={(event) => {
              updateSettings({ alignment: event.target.value as OverlayAlignment });
            }}
          >
            {ALIGNMENTS.map((alignment) => (
              <option key={alignment} value={alignment}>
                {ALIGNMENT_LABELS[alignment]}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>显示器</span>
          <select
            value={String(state.settings.targetDisplayId)}
            onChange={(event) => {
              updateSettings({ targetDisplayId: displayValueFromSelect(event.target.value) });
            }}
          >
            <option value="primary">主显示器</option>
            {state.displays.map((display) => (
              <option key={display.id} value={display.id}>
                {displayLabel(display)}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field settings-range">
          <span>透明度</span>
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
          <span>尺寸</span>
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
          <span>开机启动</span>
        </label>
      </form>
    </main>
  );
}

type SettingsPatch = Pick<
  Partial<OverlaySettings>,
  'alignment' | 'targetDisplayId' | 'opacity' | 'sizeScale' | 'startOnLogin'
>;

function displayValueFromSelect(value: string): OverlayTargetDisplayId {
  return value === 'primary' ? value : Number(value);
}

function displayLabel(display: OverlayDisplayInfo): string {
  return display.isPrimary ? `${display.label}（主）` : display.label;
}

function percentValue(value: number): number {
  return Math.round(value * 100);
}
