import { describe, expect, it, vi } from 'vitest';
import { readStartupEnabled, setStartupEnabled, type StartupAppLike } from '../../src/main/startup';

describe('startup preference adapter', () => {
  it('reads disabled startup state', () => {
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: false }),
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(false);
  });

  it('reads enabled startup state', () => {
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: true }),
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(true);
  });

  it('returns disabled when reading startup state fails', () => {
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => {
        throw new Error('login settings unavailable');
      },
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(false);
  });

  it('returns disabled in dev without reading login item settings', () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: true }));
    const appLike: StartupAppLike = {
      isPackaged: false,
      platform: 'win32',
      getPath: () => 'C:\\dev\\Codex Light.exe',
      getLoginItemSettings,
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(false);
    expect(getLoginItemSettings).not.toHaveBeenCalled();
  });

  it('returns disabled on unsupported platforms without reading login item settings', () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: true }));
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'linux',
      getPath: () => '/opt/codex-light/codex-light',
      getLoginItemSettings,
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(false);
    expect(getLoginItemSettings).not.toHaveBeenCalled();
  });

  it('reads packaged Windows startup state with explicit path and args', () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: true }));
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings,
      setLoginItemSettings: () => undefined
    };

    expect(readStartupEnabled(appLike)).toBe(true);
    expect(getLoginItemSettings).toHaveBeenCalledWith({
      path: 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      args: []
    });
  });

  it('throws when enabling startup in dev', () => {
    const setLoginItemSettings = vi.fn();
    const appLike: StartupAppLike = {
      isPackaged: false,
      platform: 'win32',
      getPath: () => 'C:\\dev\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: false }),
      setLoginItemSettings
    };

    expect(() => setStartupEnabled(appLike, true)).toThrow('Startup at login is only supported for packaged Windows builds.');
    expect(setLoginItemSettings).not.toHaveBeenCalled();
  });

  it('does nothing when disabling startup in dev', () => {
    const setLoginItemSettings = vi.fn();
    const appLike: StartupAppLike = {
      isPackaged: false,
      platform: 'win32',
      getPath: () => 'C:\\dev\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: true }),
      setLoginItemSettings
    };

    setStartupEnabled(appLike, false);

    expect(setLoginItemSettings).not.toHaveBeenCalled();
  });

  it('writes enabled startup state on packaged Windows with explicit path and args', () => {
    const setLoginItemSettings = vi.fn();
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: false }),
      setLoginItemSettings
    };

    setStartupEnabled(appLike, true);

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      path: 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      args: []
    });
  });

  it('writes disabled startup state on packaged Windows with explicit path and args', () => {
    const setLoginItemSettings = vi.fn();
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: true }),
      setLoginItemSettings
    };

    setStartupEnabled(appLike, false);

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: false,
      path: 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      args: []
    });
  });

  it('throws when writing startup state fails', () => {
    const error = new Error('cannot update login settings');
    const appLike: StartupAppLike = {
      isPackaged: true,
      platform: 'win32',
      getPath: () => 'C:\\Program Files\\Codex Light\\Codex Light.exe',
      getLoginItemSettings: () => ({ openAtLogin: false }),
      setLoginItemSettings: () => {
        throw error;
      }
    };

    expect(() => setStartupEnabled(appLike, true)).toThrow(error);
  });
});
