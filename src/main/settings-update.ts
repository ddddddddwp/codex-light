import { normalizeOverlaySettings, type OverlaySettings } from './overlay-settings';

export interface ApplyOverlaySettingsUpdateOptions {
  previousSettings: OverlaySettings;
  patch: Partial<OverlaySettings>;
  saveSettings(settings: OverlaySettings): Promise<void>;
  setStartupEnabled(enabled: boolean): void;
}

export interface OverlaySettingsUpdateEffects {
  applyLiveOverlayEffects: boolean;
}

export interface CommitOverlaySettingsUpdateOptions extends ApplyOverlaySettingsUpdateOptions {
  commit(settings: OverlaySettings, effects: OverlaySettingsUpdateEffects): void;
  publish(): void;
}

export function syncStartupState(
  settings: OverlaySettings,
  readStartupEnabled: () => boolean
): OverlaySettings {
  return {
    ...settings,
    startOnLogin: readStartupEnabled()
  };
}

export async function applyOverlaySettingsUpdate({
  previousSettings,
  patch,
  saveSettings,
  setStartupEnabled
}: ApplyOverlaySettingsUpdateOptions): Promise<OverlaySettings> {
  const nextSettings = normalizeOverlaySettings({ ...previousSettings, ...patch });

  await saveSettings(nextSettings);

  if (!Object.hasOwn(patch, 'startOnLogin')) {
    return nextSettings;
  }

  try {
    setStartupEnabled(nextSettings.startOnLogin);
  } catch (error) {
    try {
      await saveSettings(previousSettings);
    } catch {
      // Preserve the startup error shown to the user; the in-memory state is still unchanged.
    }

    throw error;
  }

  return nextSettings;
}

export function shouldApplyLiveOverlayEffectsForSettingsPatch(patch: Partial<OverlaySettings>): boolean {
  const keys = Object.keys(patch);

  return keys.length !== 1 || keys[0] !== 'trafficLightPreviewEnabled';
}

export async function commitOverlaySettingsUpdate({
  commit,
  publish,
  ...options
}: CommitOverlaySettingsUpdateOptions): Promise<OverlaySettings> {
  const nextSettings = await applyOverlaySettingsUpdate(options);
  commit(nextSettings, {
    applyLiveOverlayEffects: shouldApplyLiveOverlayEffectsForSettingsPatch(options.patch)
  });
  publish();
  return nextSettings;
}
