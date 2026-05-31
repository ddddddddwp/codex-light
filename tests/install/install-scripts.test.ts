import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

describe('installer scripts', () => {
  it('configures a formal NSIS setup executable for Win11 distribution', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      build?: {
        artifactName?: string;
        win?: { target?: string; signAndEditExecutable?: boolean };
        nsis?: Record<string, unknown>;
      };
    };

    expect(packageJson.build?.artifactName).toBe('Codex-Light-Setup-${version}.${ext}');
    expect(packageJson.build?.win?.target).toBe('nsis');
    expect(packageJson.build?.win?.signAndEditExecutable).toBe(false);
    expect(packageJson.build?.nsis).toMatchObject({
      oneClick: false,
      perMachine: false,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      runAfterFinish: true
    });
  });

  it('provides a Win11 installer that installs the app and shortcuts per user', () => {
    const script = read('scripts/install-win11.ps1');

    expect(script).toContain('npm run package:win:dir');
    expect(script).toContain('Programs\\CodexLight');
    expect(script).toContain('Desktop');
    expect(script).toContain('Start Menu');
    expect(script).toContain('CodexLight');
    expect(script).toContain('StartOnLogin');
    expect(script).toContain('NoLaunch');
    expect(script).toContain('Stop-Process');
    expect(script).toContain('Codex Light.exe');
  });

  it('provides a WSL hook installer that connects Codex CLI to the Windows runtime directory', () => {
    const script = read('scripts/install-wsl-hooks.sh');

    expect(script).toContain('powershell.exe');
    expect(script).toContain('/mnt/c/Users');
    expect(script).toContain('AppData/Local/CodexLight');
    expect(script).toContain('CODEX_LIGHT_HOME');
    expect(script).toContain('install-hooks');
    expect(script).toContain('doctor');
    expect(script).toContain('--no-test-event');
    expect(script).toContain('UserPromptSubmit');
  });

  it('provides a Win11 uninstaller that removes app files while preserving runtime state by default', () => {
    const script = read('scripts/uninstall-win11.ps1');

    expect(script).toContain('Programs\\CodexLight');
    expect(script).toContain('RemoveRuntime');
    expect(script).toContain('CodexLight');
    expect(script).toContain('Stop-Process');
    expect(script).toContain('Desktop');
    expect(script).toContain('Start Menu');
    expect(script).toContain('Startup');
  });
});
