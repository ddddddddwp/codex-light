import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CodexLightSnapshot } from '../core/types';

const execFileAsync = promisify(execFile);
const CODEX_DESKTOP_PROCESS_NAMES = new Set(['codex', 'codex desktop', 'chatgpt']);

type Platform = NodeJS.Platform | 'linux';
type RunProcessQuery = (file: string, args: string[]) => Promise<{ stdout: string }>;

export interface DetectCodexDesktopProcessOptions {
  platform?: Platform;
  run?: RunProcessQuery;
}

export async function detectCodexDesktopProcess(
  options: DetectCodexDesktopProcessOptions = {}
): Promise<boolean> {
  const platform = options.platform ?? process.platform;
  const run = options.run ?? execFileAsync;

  if (platform !== 'win32') return false;

  try {
    const { stdout } = await run('powershell.exe', [
      '-NoProfile',
      '-Command',
      "Get-Process | Where-Object { @('Codex', 'Codex Desktop', 'ChatGPT') -contains $_.ProcessName } | Select-Object -First 1 -ExpandProperty ProcessName"
    ]);
    return stdout.split(/\r?\n/).some(isCodexDesktopProcessName);
  } catch {
    return false;
  }
}

export function shouldPublishDesktopFallback(snapshot: CodexLightSnapshot | null): boolean {
  return !snapshot || snapshot.sessions.length === 0;
}

function isCodexDesktopProcessName(processName: string): boolean {
  return CODEX_DESKTOP_PROCESS_NAMES.has(processName.trim().toLowerCase());
}
