import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CodexLightSettingsState } from '../../src/main/ipc-types';
import { SettingsApp } from '../../src/renderer/SettingsApp';

const baseState: CodexLightSettingsState = {
  settings: {
    version: 1,
    alignment: 'top-left',
    targetDisplayId: 2,
    opacity: 0.84,
    sizeScale: 1.1,
    startOnLogin: true,
    language: 'zh-CN'
  },
  displays: [
    {
      id: 1,
      label: 'Built-in Display',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      isPrimary: true
    },
    {
      id: 2,
      label: 'External Monitor',
      bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
      isPrimary: false
    }
  ]
};

function installApi(initialState: CodexLightSettingsState = baseState) {
  let settingsChanged: ((state: CodexLightSettingsState) => void) | undefined;
  let currentState = initialState;
  const cleanup = vi.fn();
  const getSettings = vi.fn().mockImplementation(async () => currentState);
  const updateSettings = vi.fn(async (patch: Partial<CodexLightSettingsState['settings']>) => {
    currentState = {
      ...currentState,
      settings: {
        ...currentState.settings,
        ...patch
      }
    };

    return currentState;
  });
  const rejectNextUpdate = (error = new Error('save failed')) => {
    updateSettings.mockImplementationOnce(async () => {
      throw error;
    });
  };
  const onSettingsChanged = vi.fn((callback: (state: CodexLightSettingsState) => void) => {
    settingsChanged = callback;
    return cleanup;
  });

  window.codexLight = {
    onSnapshot: vi.fn(),
    setPinnedExpanded: vi.fn(async () => undefined),
    getSettings,
    updateSettings,
    onSettingsChanged
  };

  return {
    cleanup,
    emitSettingsChanged(state: CodexLightSettingsState) {
      currentState = state;
      settingsChanged?.(state);
    },
    getSettings,
    onSettingsChanged,
    rejectNextUpdate,
    updateSettings
  };
}

afterEach(() => {
  delete window.codexLight;
  vi.restoreAllMocks();
});

describe('SettingsApp', () => {
  it('loads settings and displays the current control values', async () => {
    const api = installApi();

    render(<SettingsApp />);

    expect(api.getSettings).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('combobox', { name: /位置/ })).toHaveValue('top-left');
    expect(screen.getByRole('combobox', { name: /显示器/ })).toHaveValue('2');
    expect(screen.getByRole('slider', { name: /透明度/ })).toHaveValue('84');
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /尺寸/ })).toHaveValue('110');
    expect(screen.getByText('110%')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /开机启动/ })).toBeChecked();
    expect(screen.getByRole('option', { name: /Built-in Display（主）/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '主显示器' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /语言/ })).toHaveValue('zh-CN');
  });

  it('updates alignment, opacity, size, and startup controls through updateSettings', async () => {
    const api = installApi({
      ...baseState,
      settings: {
        ...baseState.settings,
        alignment: 'top-center',
        opacity: 0.96,
        sizeScale: 1,
        startOnLogin: false
      }
    });

    render(<SettingsApp />);

    fireEvent.change(await screen.findByRole('combobox', { name: /位置/ }), {
      target: { value: 'top-right' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ alignment: 'top-right' });
    });
    expect(screen.getByRole('combobox', { name: /位置/ })).toHaveValue('top-right');

    fireEvent.change(screen.getByRole('slider', { name: /透明度/ }), {
      target: { value: '88' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ opacity: 0.88 });
    });
    expect(screen.getByText('88%')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: /尺寸/ }), {
      target: { value: '115' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ sizeScale: 1.15 });
    });
    expect(screen.getByText('115%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /开机启动/ }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ startOnLogin: true });
    });
    expect(screen.getByRole('checkbox', { name: /开机启动/ })).toBeChecked();
  });

  it('switches the settings surface between Chinese and English', async () => {
    const api = installApi();

    render(<SettingsApp />);

    expect(await screen.findByRole('heading', { name: 'Codex Light 设置' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: /语言/ }), {
      target: { value: 'en-US' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ language: 'en-US' });
    });

    expect(await screen.findByRole('heading', { name: 'Codex Light Settings' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Language/ })).toHaveValue('en-US');
    expect(screen.getByRole('checkbox', { name: /Start at login/ })).toBeChecked();
  });

  it('updates display selection as primary and numeric target ids', async () => {
    const api = installApi({
      ...baseState,
      settings: {
        ...baseState.settings,
        targetDisplayId: 'primary'
      }
    });

    render(<SettingsApp />);

    fireEvent.change(await screen.findByRole('combobox', { name: /显示器/ }), {
      target: { value: '2' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ targetDisplayId: 2 });
    });
    expect(screen.getByRole('combobox', { name: /显示器/ })).toHaveValue('2');

    fireEvent.change(screen.getByRole('combobox', { name: /显示器/ }), {
      target: { value: 'primary' }
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenLastCalledWith({ targetDisplayId: 'primary' });
    });
    expect(screen.getByRole('combobox', { name: /显示器/ })).toHaveValue('primary');
  });

  it('shows a save error when updateSettings rejects without an unhandled rejection', async () => {
    const api = installApi();
    api.rejectNextUpdate();

    render(<SettingsApp />);

    fireEvent.change(await screen.findByRole('combobox', { name: /位置/ }), {
      target: { value: 'top-right' }
    });

    expect(await screen.findByText('设置保存失败')).toBeInTheDocument();
    expect(api.updateSettings).toHaveBeenCalledWith({ alignment: 'top-right' });
  });

  it('syncs external settings changes and cleans up the subscription on unmount', async () => {
    const api = installApi();
    const { unmount } = render(<SettingsApp />);

    expect(await screen.findByRole('combobox', { name: /位置/ })).toHaveValue('top-left');

    act(() => {
      api.emitSettingsChanged({
        ...baseState,
        settings: {
          ...baseState.settings,
          alignment: 'top-right',
          targetDisplayId: 'primary',
          opacity: 0.72,
          sizeScale: 0.9,
          startOnLogin: false,
          language: 'zh-CN'
        }
      });
    });

    expect(screen.getByRole('combobox', { name: /位置/ })).toHaveValue('top-right');
    expect(screen.getByRole('combobox', { name: /显示器/ })).toHaveValue('primary');
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /开机启动/ })).not.toBeChecked();

    unmount();

    expect(api.cleanup).toHaveBeenCalledTimes(1);
  });

  it('shows a stable fallback when the preload api is unavailable', () => {
    render(<SettingsApp />);

    expect(screen.getByText('设置暂不可用')).toBeInTheDocument();
  });
});
