import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type OverlayAlignment = 'top-center' | 'top-left' | 'top-right';
export type OverlayTargetDisplayId = 'primary' | number;
export type OverlayLanguage = 'zh-CN' | 'en-US';

export interface OverlaySettings {
  version: 1;
  alignment: OverlayAlignment;
  targetDisplayId: OverlayTargetDisplayId;
  opacity: number;
  sizeScale: number;
  startOnLogin: boolean;
  trafficLightPreviewEnabled: boolean;
  language: OverlayLanguage;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  version: 1,
  alignment: 'top-center',
  targetDisplayId: 'primary',
  opacity: 0.96,
  sizeScale: 1,
  startOnLogin: false,
  trafficLightPreviewEnabled: true,
  language: 'zh-CN'
};

const SETTINGS_FILE_NAME = 'overlay-settings.json';
const ALIGNMENTS: readonly OverlayAlignment[] = ['top-center', 'top-left', 'top-right'];
const LANGUAGES: readonly OverlayLanguage[] = ['zh-CN', 'en-US'];

function settingsPath(userDataDir: string): string {
  return join(userDataDir, SETTINGS_FILE_NAME);
}

function defaultOverlaySettings(): OverlaySettings {
  return { ...DEFAULT_OVERLAY_SETTINGS };
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === code;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function targetDisplayIdOrDefault(value: unknown): OverlayTargetDisplayId {
  if (value === 'primary') {
    return value;
  }

  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
    ? value
    : DEFAULT_OVERLAY_SETTINGS.targetDisplayId;
}

export function normalizeOverlaySettings(value: unknown): OverlaySettings {
  const persisted = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};

  const alignment = ALIGNMENTS.includes(persisted.alignment as OverlayAlignment)
    ? persisted.alignment as OverlayAlignment
    : DEFAULT_OVERLAY_SETTINGS.alignment;
  const language = LANGUAGES.includes(persisted.language as OverlayLanguage)
    ? persisted.language as OverlayLanguage
    : DEFAULT_OVERLAY_SETTINGS.language;

  return {
    version: 1,
    alignment,
    targetDisplayId: targetDisplayIdOrDefault(persisted.targetDisplayId),
    opacity: clamp(numberOrDefault(persisted.opacity, DEFAULT_OVERLAY_SETTINGS.opacity), 0.72, 1),
    sizeScale: clamp(numberOrDefault(persisted.sizeScale, DEFAULT_OVERLAY_SETTINGS.sizeScale), 0.85, 1.25),
    startOnLogin: typeof persisted.startOnLogin === 'boolean'
      ? persisted.startOnLogin
      : DEFAULT_OVERLAY_SETTINGS.startOnLogin,
    trafficLightPreviewEnabled: typeof persisted.trafficLightPreviewEnabled === 'boolean'
      ? persisted.trafficLightPreviewEnabled
      : DEFAULT_OVERLAY_SETTINGS.trafficLightPreviewEnabled,
    language
  };
}

export async function loadOverlaySettings(userDataDir: string): Promise<OverlaySettings> {
  let fileContents: string;

  try {
    fileContents = await readFile(settingsPath(userDataDir), 'utf8');
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return defaultOverlaySettings();
    }

    throw error;
  }

  try {
    return normalizeOverlaySettings(JSON.parse(fileContents));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return defaultOverlaySettings();
    }

    throw error;
  }
}

export async function saveOverlaySettings(userDataDir: string, settings: OverlaySettings): Promise<void> {
  const normalized = normalizeOverlaySettings(settings);
  const path = settingsPath(userDataDir);
  const tempPath = `${path}.tmp`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}
