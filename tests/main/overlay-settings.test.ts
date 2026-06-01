import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OVERLAY_SETTINGS,
  loadOverlaySettings,
  normalizeOverlaySettings,
  saveOverlaySettings
} from '../../src/main/overlay-settings';

describe('overlay settings', () => {
  it('defines the default overlay settings', () => {
    expect(DEFAULT_OVERLAY_SETTINGS).toEqual({
      version: 1,
      alignment: 'top-center',
      targetDisplayId: 'primary',
      opacity: 0.96,
      sizeScale: 1,
      startOnLogin: false,
      trafficLightPreviewEnabled: true,
      language: 'zh-CN'
    });
  });

  it('normalizes invalid persisted values to safe settings', () => {
    expect(normalizeOverlaySettings({ opacity: 0.1 }).opacity).toBe(0.72);
    expect(normalizeOverlaySettings({ opacity: 2 }).opacity).toBe(1);
    expect(normalizeOverlaySettings({ sizeScale: 0.2 }).sizeScale).toBe(0.85);
    expect(normalizeOverlaySettings({ sizeScale: 2 }).sizeScale).toBe(1.25);
    expect(normalizeOverlaySettings({ alignment: 'bottom-left' }).alignment).toBe('top-center');
    expect(normalizeOverlaySettings({ targetDisplayId: 'secondary' }).targetDisplayId).toBe('primary');
    expect(normalizeOverlaySettings({ targetDisplayId: Number.NaN }).targetDisplayId).toBe('primary');
    expect(normalizeOverlaySettings({ targetDisplayId: Number.POSITIVE_INFINITY }).targetDisplayId).toBe('primary');
    expect(normalizeOverlaySettings({ targetDisplayId: 1.5 }).targetDisplayId).toBe('primary');
    expect(normalizeOverlaySettings({ startOnLogin: 'yes' }).startOnLogin).toBe(false);
    expect(normalizeOverlaySettings({ language: 'fr-FR' }).language).toBe('zh-CN');
    expect(normalizeOverlaySettings({ language: 'en-US' }).language).toBe('en-US');
  });

  it('defaults traffic-light preview support to enabled', () => {
    expect(normalizeOverlaySettings({}).trafficLightPreviewEnabled).toBe(true);
  });

  it('preserves disabled traffic-light preview support', () => {
    expect(normalizeOverlaySettings({ trafficLightPreviewEnabled: false }).trafficLightPreviewEnabled).toBe(false);
  });

  it('falls back to enabled for invalid traffic-light preview values', () => {
    expect(normalizeOverlaySettings({ trafficLightPreviewEnabled: 'no' }).trafficLightPreviewEnabled).toBe(true);
  });

  it('loads fresh defaults when the settings file is missing or contains bad JSON', async () => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'codex-light-settings-'));

    try {
      const missingFileSettings = await loadOverlaySettings(userDataDir);

      expect(missingFileSettings).toEqual(DEFAULT_OVERLAY_SETTINGS);
      expect(missingFileSettings).not.toBe(DEFAULT_OVERLAY_SETTINGS);

      await writeFile(join(userDataDir, 'overlay-settings.json'), '{ bad json', 'utf8');

      const badJsonSettings = await loadOverlaySettings(userDataDir);

      expect(badJsonSettings).toEqual(DEFAULT_OVERLAY_SETTINGS);
      expect(badJsonSettings).not.toBe(DEFAULT_OVERLAY_SETTINGS);
    } finally {
      await rm(userDataDir, { recursive: true, force: true });
    }
  });

  it('rejects non-missing settings file read failures', async () => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'codex-light-settings-'));

    try {
      await mkdir(join(userDataDir, 'overlay-settings.json'));

      await expect(loadOverlaySettings(userDataDir)).rejects.toMatchObject({ code: 'EISDIR' });
    } finally {
      await rm(userDataDir, { recursive: true, force: true });
    }
  });

  it('saves formatted JSON and loads normalized settings', async () => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'codex-light-settings-'));

    try {
      await saveOverlaySettings(userDataDir, {
        ...DEFAULT_OVERLAY_SETTINGS,
        alignment: 'top-right',
        targetDisplayId: 7,
        opacity: 0.8,
        sizeScale: 1.1,
        startOnLogin: true,
        trafficLightPreviewEnabled: false,
        language: 'en-US'
      });

      const fileContents = await readFile(join(userDataDir, 'overlay-settings.json'), 'utf8');

      expect(fileContents).toBe(`${JSON.stringify({
        version: 1,
        alignment: 'top-right',
        targetDisplayId: 7,
        opacity: 0.8,
        sizeScale: 1.1,
        startOnLogin: true,
        trafficLightPreviewEnabled: false,
        language: 'en-US'
      }, null, 2)}\n`);
      await expect(loadOverlaySettings(userDataDir)).resolves.toEqual({
        version: 1,
        alignment: 'top-right',
        targetDisplayId: 7,
        opacity: 0.8,
        sizeScale: 1.1,
        startOnLogin: true,
        trafficLightPreviewEnabled: false,
        language: 'en-US'
      });
    } finally {
      await rm(userDataDir, { recursive: true, force: true });
    }
  });
});
