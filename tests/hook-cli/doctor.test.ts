import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctor } from '../../src/hook-cli/doctor';

describe('doctor', () => {
  it('reports hook executable and desktop fallback status', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-doctor-'));
    const hookExecutable = path.join(dir, 'codex-light.cmd');
    const hooksPath = path.join(dir, 'hooks.json');
    await fs.writeFile(hookExecutable, '@echo off\n', 'utf8');
    await fs.writeFile(hooksPath, JSON.stringify({ hooks: {} }), 'utf8');

    const report = await doctor({
      config: hooksPath,
      hookExecutable,
      runtimeDir: dir,
      detectDesktopProcess: async () => true
    });

    expect(report.hookExecutablePath).toBe(hookExecutable);
    expect(report.hookExecutableExists).toBe(true);
    expect(report.desktopFallbackAvailable).toBe(true);
  });
});
