export interface StartupAppLike {
  isPackaged?: boolean;
  platform?: NodeJS.Platform;
  getPath?(name: 'exe'): string;
  getLoginItemSettings(options?: { path?: string; args?: string[] }): { openAtLogin?: boolean };
  setLoginItemSettings(options: { openAtLogin: boolean; path?: string; args?: string[] }): void;
}

const UNSUPPORTED_STARTUP_MESSAGE = 'Startup at login is only supported for packaged Windows builds.';

function canUseLoginItems(appLike: StartupAppLike): boolean {
  return appLike.isPackaged !== false && (appLike.platform ?? process.platform) === 'win32';
}

function loginItemOptions(appLike: StartupAppLike): { path?: string; args: string[] } {
  return {
    ...(appLike.getPath ? { path: appLike.getPath('exe') } : {}),
    args: []
  };
}

export function readStartupEnabled(appLike: StartupAppLike): boolean {
  if (!canUseLoginItems(appLike)) {
    return false;
  }

  try {
    return appLike.getLoginItemSettings(loginItemOptions(appLike)).openAtLogin === true;
  } catch {
    return false;
  }
}

export function setStartupEnabled(appLike: StartupAppLike, enabled: boolean): void {
  if (!canUseLoginItems(appLike)) {
    if (enabled) {
      throw new Error(UNSUPPORTED_STARTUP_MESSAGE);
    }

    return;
  }

  appLike.setLoginItemSettings({
    openAtLogin: enabled,
    ...loginItemOptions(appLike)
  });
}
