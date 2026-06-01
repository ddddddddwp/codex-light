import type { CodexLightSnapshot } from '../core/types';
import type { OverlaySettings } from './overlay-settings';

export interface OverlayDisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface CodexLightSettingsState {
  settings: OverlaySettings;
  displays: OverlayDisplayInfo[];
}

export interface CodexLightApi {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void): () => void;
  setPinnedExpanded(value: boolean): Promise<void>;
  getSettings(): Promise<CodexLightSettingsState>;
  updateSettings(patch: Partial<OverlaySettings>): Promise<CodexLightSettingsState>;
  onSettingsChanged(callback: (state: CodexLightSettingsState) => void): () => void;
}

declare global {
  interface Window {
    codexLight?: CodexLightApi;
  }
}
