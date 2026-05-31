import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } from 'electron';
import path from 'node:path';
import { watch } from 'chokidar';
import {
  DEFAULT_CLI_SESSION_STALE_MS,
  aggregateSessions,
  createDesktopFallbackEvent,
  expireStaleCliSessions
} from '../core/normalize';
import { getRuntimeDir, getStateFile } from '../core/runtime-paths';
import { readSnapshot } from '../core/storage';
import { detectCodexDesktopProcess, shouldPublishDesktopFallback } from './desktop-fallback';
import type { CodexLightSettingsState, OverlayDisplayInfo } from './ipc-types';
import { computeOverlayBounds, selectOverlayDisplay, type DisplayLike, type OverlayMode } from './overlay-bounds';
import {
  DEFAULT_OVERLAY_SETTINGS,
  loadOverlaySettings,
  normalizeOverlaySettings,
  saveOverlaySettings,
  type OverlaySettings
} from './overlay-settings';
import { createSnapshotSync } from './snapshot-sync';

let overlay: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let overlaySettings: OverlaySettings = { ...DEFAULT_OVERLAY_SETTINGS };
let isPinnedExpanded = false;

async function createOverlay(): Promise<void> {
  overlay = new BrowserWindow({
    width: 300,
    height: 78,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  applyOverlayBounds();

  if (process.env.VITE_DEV_SERVER_URL) {
    await overlay.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await overlay.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
  }

  overlay.once('ready-to-show', () => overlay?.showInactive());
}

function applyOverlayBounds(): void {
  if (!overlay) return;

  const display = selectOverlayDisplay(getDisplayLikes(), overlaySettings.targetDisplayId);
  overlay.setBounds(computeOverlayBounds(display, getOverlayMode(), overlaySettings));
  overlay.setOpacity(overlaySettings.opacity);
}

function getOverlayMode(): OverlayMode {
  return isPinnedExpanded ? 'expanded' : 'compact';
}

function getDisplayLikes(): DisplayLike[] {
  const primaryId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    workArea: display.workArea,
    isPrimary: display.id === primaryId
  }));
}

function getSettingsState(): CodexLightSettingsState {
  const primaryId = screen.getPrimaryDisplay().id;

  return {
    settings: { ...overlaySettings },
    displays: screen.getAllDisplays().map((display, index): OverlayDisplayInfo => ({
      id: display.id,
      label: display.label || `Display ${index + 1}`,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      },
      isPrimary: display.id === primaryId
    }))
  };
}

function publishSettingsChanged(): void {
  const state = getSettingsState();
  overlay?.webContents.send('settings:changed', state);
  settingsWindow?.webContents.send('settings:changed', state);
}

function handleDisplayChange(): void {
  applyOverlayBounds();
  publishSettingsChanged();
}

function createTray(): void {
  tray = new Tray(createTrayImage());
  tray.setToolTip('Codex Light');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => {
        createOrShowSettingsWindow().catch((error: unknown) => {
          console.error('Failed to open settings window:', error);
        });
      }
    },
    { label: 'Show Island', click: () => overlay?.showInactive() },
    { label: 'Hide Island', click: () => overlay?.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
}

async function createOrShowSettingsWindow(): Promise<void> {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const window = new BrowserWindow({
    width: 760,
    height: 560,
    frame: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow = window;

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    if (settingsWindow === window) {
      settingsWindow = null;
    }
  });

  try {
    if (process.env.VITE_DEV_SERVER_URL) {
      await window.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=settings`);
    } else {
      await window.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
        query: { view: 'settings' }
      });
    }
  } catch (error) {
    console.error('Failed to load settings window:', error);

    if (settingsWindow === window) {
      settingsWindow = null;
    }

    if (!window.isDestroyed()) {
      window.destroy();
    }

    throw error;
  }
}

function watchSnapshot(): void {
  const runtimeDir = getRuntimeDir();
  const stateFile = getStateFile(runtimeDir);
  const staleMs = getCliSessionStaleMs();
  const sync = createSnapshotSync({
    read: async () => {
      const snapshot = await readSnapshot(runtimeDir);
      return snapshot ? expireStaleCliSessions(snapshot, new Date(), staleMs) : null;
    },
    publish: (snapshot) => overlay?.webContents.send('snapshot', snapshot)
  });
  const watcher = watch(stateFile, { ignoreInitial: false, awaitWriteFinish: true });
  watcher.on('add', () => void sync.pollOnce());
  watcher.on('change', () => void sync.pollOnce());
  void sync.pollOnce();
  sync.startPolling();
}

function startDesktopFallbackPolling(): void {
  const runtimeDir = getRuntimeDir();
  const staleMs = getCliSessionStaleMs();
  const poll = async () => {
    if (!overlay) return;
    const snapshot = await readSnapshot(runtimeDir);
    const existing = snapshot ? expireStaleCliSessions(snapshot, new Date(), staleMs) : null;
    if (!shouldPublishDesktopFallback(existing)) return;
    if (await detectCodexDesktopProcess()) {
      overlay.webContents.send('snapshot', aggregateSessions([createDesktopFallbackEvent()]));
    }
  };

  void poll();
  setInterval(() => void poll(), 10_000);
}

function getCliSessionStaleMs(env = process.env): number {
  const value = Number(env.CODEX_LIGHT_CLI_STALE_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CLI_SESSION_STALE_MS;
}

function createTrayImage(): Electron.NativeImage {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="10" fill="#0d1117"/>
      <circle cx="16" cy="16" r="7" fill="#31d27c"/>
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
}

ipcMain.on('set-pinned-expanded', (_event, value: boolean) => {
  isPinnedExpanded = value;
  applyOverlayBounds();
});

ipcMain.handle('settings:get', () => getSettingsState());

ipcMain.handle('settings:update', async (_event, patch: Partial<OverlaySettings>) => {
  const nextSettings = normalizeOverlaySettings({ ...overlaySettings, ...patch });
  await saveOverlaySettings(app.getPath('userData'), nextSettings);
  overlaySettings = nextSettings;
  applyOverlayBounds();
  publishSettingsChanged();
  return getSettingsState();
});

app.whenReady().then(async () => {
  try {
    overlaySettings = await loadOverlaySettings(app.getPath('userData'));
  } catch (error) {
    console.error('Failed to load overlay settings; using defaults:', error);
    overlaySettings = { ...DEFAULT_OVERLAY_SETTINGS };
  }

  await createOverlay();
  createTray();
  screen.on('display-added', handleDisplayChange);
  screen.on('display-removed', handleDisplayChange);
  screen.on('display-metrics-changed', handleDisplayChange);
  watchSnapshot();
  startDesktopFallbackPolling();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
