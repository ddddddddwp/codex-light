import os from 'node:os';
import path from 'node:path';

export function getRuntimeDir(env = process.env): string {
  if (env.CODEX_LIGHT_HOME) return env.CODEX_LIGHT_HOME;
  if (process.platform === 'win32' && env.LOCALAPPDATA) {
    return path.join(env.LOCALAPPDATA, 'CodexLight');
  }
  return path.join(os.tmpdir(), 'CodexLight');
}

export function getStateFile(runtimeDir = getRuntimeDir()): string {
  return path.join(runtimeDir, 'state.json');
}

export function getEventLogFile(runtimeDir = getRuntimeDir()): string {
  return path.join(runtimeDir, 'events.jsonl');
}
