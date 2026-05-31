import { describe, expect, it } from 'vitest';
import { detectCodexDesktopProcess, shouldPublishDesktopFallback } from '../../src/main/desktop-fallback';

describe('detectCodexDesktopProcess', () => {
  it('returns false without invoking powershell on non-Windows platforms', async () => {
    let invoked = false;
    const detected = await detectCodexDesktopProcess({
      platform: 'linux',
      run: async () => {
        invoked = true;
        return { stdout: 'Codex' };
      }
    });

    expect(detected).toBe(false);
    expect(invoked).toBe(false);
  });

  it('detects matching process output on Windows', async () => {
    const detected = await detectCodexDesktopProcess({
      platform: 'win32',
      run: async () => ({ stdout: 'Codex Desktop\r\n' })
    });

    expect(detected).toBe(true);
  });

  it('does not detect Codex Light itself as a Codex desktop process', async () => {
    const detected = await detectCodexDesktopProcess({
      platform: 'win32',
      run: async () => ({ stdout: 'Codex Light\r\n' })
    });

    expect(detected).toBe(false);
  });

  it('does not publish desktop fallback when a CLI snapshot already has sessions', () => {
    expect(shouldPublishDesktopFallback({
      version: 1,
      generatedAt: '2026-05-31T00:00:00.000Z',
      globalState: 'idle',
      activeSessionCount: 0,
      sessions: [{
        sessionId: 'session-1',
        source: 'cli',
        state: 'idle',
        startedAt: '2026-05-31T00:00:00.000Z',
        updatedAt: '2026-05-31T00:00:00.000Z'
      }],
      diagnostics: []
    })).toBe(false);
  });
});
