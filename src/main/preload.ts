import { contextBridge, ipcRenderer } from 'electron';
import type { CodexLightSnapshot } from '../core/types';
import type { CodexLightApi, CodexLightSettingsState } from './ipc-types';
import type { OverlaySettings } from './overlay-settings';

const api: CodexLightApi = {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void) {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: CodexLightSnapshot) => callback(snapshot);
    ipcRenderer.on('snapshot', listener);
    return () => ipcRenderer.off('snapshot', listener);
  },
  setPinnedExpanded(value: boolean) {
    return ipcRenderer.invoke('set-pinned-expanded', value) as Promise<void>;
  },
  getSettings() {
    return ipcRenderer.invoke('settings:get') as Promise<CodexLightSettingsState>;
  },
  updateSettings(patch: Partial<OverlaySettings>) {
    return ipcRenderer.invoke('settings:update', patch) as Promise<CodexLightSettingsState>;
  },
  onSettingsChanged(callback: (state: CodexLightSettingsState) => void) {
    const listener = (_event: Electron.IpcRendererEvent, state: CodexLightSettingsState) => callback(state);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.off('settings:changed', listener);
  }
};

contextBridge.exposeInMainWorld('codexLight', api);
