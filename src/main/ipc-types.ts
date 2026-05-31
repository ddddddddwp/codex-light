import type { CodexLightSnapshot } from '../core/types';

export interface CodexLightApi {
  onSnapshot(callback: (snapshot: CodexLightSnapshot) => void): () => void;
  setPinnedExpanded(value: boolean): void;
}

declare global {
  interface Window {
    codexLight?: CodexLightApi;
  }
}
