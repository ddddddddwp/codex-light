import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, type OverlaySettings } from '../../src/main/overlay-settings';
import {
  applyOverlaySettingsUpdate,
  commitOverlaySettingsUpdate,
  syncStartupState
} from '../../src/main/settings-update';

function settings(overrides: Partial<OverlaySettings> = {}): OverlaySettings {
  return {
    ...DEFAULT_OVERLAY_SETTINGS,
    ...overrides
  };
}

describe('overlay settings update transaction', () => {
  it('syncs persisted startup enabled to current disabled startup state', () => {
    expect(syncStartupState(settings({ startOnLogin: true }), () => false)).toEqual(settings({
      startOnLogin: false
    }));
  });

  it('syncs persisted startup disabled to current enabled startup state', () => {
    expect(syncStartupState(settings({ startOnLogin: false }), () => true)).toEqual(settings({
      startOnLogin: true
    }));
  });

  it('saves settings before applying startup state', async () => {
    const previous = settings({ startOnLogin: false });
    const saveSettings = vi.fn<(_: OverlaySettings) => Promise<void>>().mockResolvedValue(undefined);
    const setStartupEnabled = vi.fn();

    await expect(applyOverlaySettingsUpdate({
      previousSettings: previous,
      patch: { startOnLogin: true },
      saveSettings,
      setStartupEnabled
    })).resolves.toEqual(settings({ startOnLogin: true }));

    expect(saveSettings).toHaveBeenCalledWith(settings({ startOnLogin: true }));
    expect(setStartupEnabled).toHaveBeenCalledWith(true);
    expect(saveSettings.mock.invocationCallOrder[0]).toBeLessThan(setStartupEnabled.mock.invocationCallOrder[0]);
  });

  it('does not apply startup state when saving settings fails', async () => {
    const error = new Error('disk unavailable');
    const saveSettings = vi.fn<(_: OverlaySettings) => Promise<void>>().mockRejectedValue(error);
    const setStartupEnabled = vi.fn();

    await expect(applyOverlaySettingsUpdate({
      previousSettings: settings({ startOnLogin: false }),
      patch: { startOnLogin: true },
      saveSettings,
      setStartupEnabled
    })).rejects.toThrow(error);

    expect(setStartupEnabled).not.toHaveBeenCalled();
  });

  it('rolls back persisted settings when startup update fails', async () => {
    const previous = settings({ startOnLogin: false, opacity: 0.8 });
    const error = new Error('startup unavailable');
    const saveSettings = vi.fn<(_: OverlaySettings) => Promise<void>>().mockResolvedValue(undefined);
    const setStartupEnabled = vi.fn(() => {
      throw error;
    });

    await expect(applyOverlaySettingsUpdate({
      previousSettings: previous,
      patch: { startOnLogin: true, opacity: 0.9 },
      saveSettings,
      setStartupEnabled
    })).rejects.toThrow(error);

    expect(saveSettings).toHaveBeenNthCalledWith(1, settings({ startOnLogin: true, opacity: 0.9 }));
    expect(saveSettings).toHaveBeenNthCalledWith(2, previous);
  });

  it('does not touch startup state when the patch omits startOnLogin', async () => {
    const saveSettings = vi.fn<(_: OverlaySettings) => Promise<void>>().mockResolvedValue(undefined);
    const setStartupEnabled = vi.fn();

    await expect(applyOverlaySettingsUpdate({
      previousSettings: settings({ startOnLogin: false }),
      patch: { opacity: 0.9 },
      saveSettings,
      setStartupEnabled
    })).resolves.toEqual(settings({ startOnLogin: false, opacity: 0.9 }));

    expect(setStartupEnabled).not.toHaveBeenCalled();
  });

  it('does not commit or publish when startup update fails', async () => {
    const error = new Error('startup unavailable');
    const commit = vi.fn();
    const publish = vi.fn();

    await expect(commitOverlaySettingsUpdate({
      previousSettings: settings({ startOnLogin: false }),
      patch: { startOnLogin: true },
      saveSettings: vi.fn<(_: OverlaySettings) => Promise<void>>().mockResolvedValue(undefined),
      setStartupEnabled: () => {
        throw error;
      },
      commit,
      publish
    })).rejects.toThrow(error);

    expect(commit).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('commits and publishes after a successful settings update', async () => {
    const nextSettings = settings({ startOnLogin: true, opacity: 0.9 });
    const commit = vi.fn();
    const publish = vi.fn();

    await expect(commitOverlaySettingsUpdate({
      previousSettings: settings({ startOnLogin: false }),
      patch: { startOnLogin: true, opacity: 0.9 },
      saveSettings: vi.fn<(_: OverlaySettings) => Promise<void>>().mockResolvedValue(undefined),
      setStartupEnabled: vi.fn(),
      commit,
      publish
    })).resolves.toEqual(nextSettings);

    expect(commit).toHaveBeenCalledWith(nextSettings);
    expect(publish).toHaveBeenCalledOnce();
  });
});
