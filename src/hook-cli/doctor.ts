import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getRuntimeDir, getStateFile } from '../core/runtime-paths';
import { detectCodexDesktopProcess } from '../main/desktop-fallback';

export interface DoctorReport {
  runtimeDir: string;
  stateFile: string;
  hooksPath: string;
  hookExecutablePath: string;
  runtimeWritable: boolean;
  stateExists: boolean;
  hooksExists: boolean;
  hookExecutableExists: boolean;
  desktopFallbackAvailable: boolean;
}

export interface DoctorOptions {
  config?: string;
  hookExecutable?: string;
  runtimeDir?: string;
  detectDesktopProcess?: () => Promise<boolean>;
}

export async function doctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const runtimeDir = options.runtimeDir ?? getRuntimeDir();
  const hooksPath = options.config ?? path.join(os.homedir(), '.codex', 'hooks.json');
  const hookExecutablePath = options.hookExecutable ?? process.execPath;
  const detectDesktopProcess = options.detectDesktopProcess ?? detectCodexDesktopProcess;
  await fs.mkdir(runtimeDir, { recursive: true });

  return {
    runtimeDir,
    stateFile: getStateFile(runtimeDir),
    hooksPath,
    hookExecutablePath,
    runtimeWritable: await canWrite(runtimeDir),
    stateExists: await exists(getStateFile(runtimeDir)),
    hooksExists: await exists(hooksPath),
    hookExecutableExists: await exists(hookExecutablePath),
    desktopFallbackAvailable: await detectDesktopProcess()
  };
}

async function canWrite(dir: string): Promise<boolean> {
  const probe = path.join(dir, '.doctor-write-test');
  try {
    await fs.writeFile(probe, 'ok', 'utf8');
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
