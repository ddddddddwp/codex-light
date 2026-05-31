import { contextBridge, ipcRenderer } from 'electron';
import type { CodexLightSnapshot } from '../core/types';
import type { CodexLightApi } from './ipc-types';

const api: CodexLightApi = {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void) {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: CodexLightSnapshot) => callback(snapshot);
    ipcRenderer.on('snapshot', listener);
    return () => ipcRenderer.off('snapshot', listener);
  },
  setPinnedExpanded(value: boolean) {
    ipcRenderer.send('set-pinned-expanded', value);
  }
};

contextBridge.exposeInMainWorld('codexLight', api);
