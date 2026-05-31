import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } from 'electron';
import path from 'node:path';
import { watch } from 'chokidar';
import { aggregateSessions, createDesktopFallbackEvent } from '../core/normalize';
import { getRuntimeDir, getStateFile } from '../core/runtime-paths';
import { readSnapshot } from '../core/storage';
import { detectCodexDesktopProcess, shouldPublishDesktopFallback } from './desktop-fallback';
import { createSnapshotSync } from './snapshot-sync';

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;

const COMPACT = { width: 300, height: 78 };
const EXPANDED = { width: 580, height: 128 };

async function createOverlay(): Promise<void> {
  overlay = new BrowserWindow({
    width: COMPACT.width,
    height: COMPACT.height,
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
  positionOverlay(COMPACT);

  if (process.env.VITE_DEV_SERVER_URL) {
    await overlay.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await overlay.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
  }

  overlay.once('ready-to-show', () => overlay?.showInactive());
}

function positionOverlay(size: { width: number; height: number }): void {
  if (!overlay) return;
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  overlay.setBounds({
    x: Math.round(x + width / 2 - size.width / 2),
    y: y + 10,
    width: size.width,
    height: size.height
  });
}

function createTray(): void {
  tray = new Tray(createTrayImage());
  tray.setToolTip('Codex Light');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Island', click: () => overlay?.showInactive() },
    { label: 'Hide Island', click: () => overlay?.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
}

function watchSnapshot(): void {
  const runtimeDir = getRuntimeDir();
  const stateFile = getStateFile(runtimeDir);
  const sync = createSnapshotSync({
    read: () => readSnapshot(runtimeDir),
    publish: (snapshot) => overlay?.webContents.send('snapshot', snapshot)
  });
  const watcher = watch(stateFile, { ignoreInitial: false, awaitWriteFinish: true });
  watcher.on('add', () => void sync.pollOnce());
  watcher.on('change', () => void sync.pollOnce());
  void sync.pollOnce();
  sync.startPolling();
}

function startDesktopFallbackPolling(): void {
  const poll = async () => {
    if (!overlay) return;
    const existing = await readSnapshot(getRuntimeDir());
    if (!shouldPublishDesktopFallback(existing)) return;
    if (await detectCodexDesktopProcess()) {
      overlay.webContents.send('snapshot', aggregateSessions([createDesktopFallbackEvent()]));
    }
  };

  void poll();
  setInterval(() => void poll(), 10_000);
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
  positionOverlay(value ? EXPANDED : COMPACT);
});

app.whenReady().then(async () => {
  await createOverlay();
  createTray();
  watchSnapshot();
  startDesktopFallbackPolling();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
