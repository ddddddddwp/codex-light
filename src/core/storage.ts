import fs from 'node:fs/promises';
import type { CodexLightEvent, CodexLightSnapshot } from './types';
import { getEventLogFile, getStateFile } from './runtime-paths';

export async function appendEvent(runtimeDir: string, event: CodexLightEvent): Promise<void> {
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.appendFile(getEventLogFile(runtimeDir), `${JSON.stringify(event)}\n`, 'utf8');
}

export async function readEvents(runtimeDir: string): Promise<CodexLightEvent[]> {
  try {
    const content = await fs.readFile(getEventLogFile(runtimeDir), 'utf8');
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as CodexLightEvent);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function writeSnapshotAtomic(runtimeDir: string, snapshot: CodexLightSnapshot): Promise<void> {
  await fs.mkdir(runtimeDir, { recursive: true });
  const target = getStateFile(runtimeDir);
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify(snapshot, null, 2), 'utf8');
  await fs.rename(temp, target);
}

export async function readSnapshot(runtimeDir: string): Promise<CodexLightSnapshot | null> {
  try {
    const content = await fs.readFile(getStateFile(runtimeDir), 'utf8');
    return JSON.parse(content) as CodexLightSnapshot;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
