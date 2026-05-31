import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'Stop'];
const MARKER = 'Codex Light generated hook block';

export interface InstallHooksOptions {
  config?: string;
  hookCommand?: string;
}

interface HookCommand {
  type: 'command';
  command: string;
  commandWindows?: string;
  timeout?: number;
}

interface HookGroup {
  description?: string;
  hooks?: HookCommand[];
}

interface HooksFile {
  description?: string;
  hooks?: Record<string, HookGroup[]>;
}

export async function installHooks(options: InstallHooksOptions = {}): Promise<string> {
  const configPath = options.config ?? defaultHooksPath();
  const hookCommand = options.hookCommand ?? 'codex-light hook';
  const current = await readHooks(configPath);
  const next: HooksFile = {
    ...current,
    description: current.description ?? 'Codex hooks',
    hooks: { ...(current.hooks ?? {}) }
  };

  for (const event of EVENTS) {
    const groups = Array.isArray(next.hooks?.[event]) ? next.hooks[event] : [];
    const withoutExisting = groups.filter((group) => group.description !== MARKER);
    withoutExisting.push({
      description: MARKER,
      hooks: [
        {
          type: 'command',
          command: hookCommand,
          commandWindows: hookCommand,
          timeout: 5
        }
      ]
    });
    next.hooks![event] = withoutExisting;
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await backupIfExists(configPath);
  await fs.writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return configPath;
}

async function readHooks(configPath: string): Promise<HooksFile> {
  try {
    return JSON.parse(await fs.readFile(configPath, 'utf8')) as HooksFile;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {};
    throw error;
  }
}

async function backupIfExists(configPath: string): Promise<void> {
  try {
    await fs.copyFile(configPath, `${configPath}.bak`);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return;
    throw error;
  }
}

function defaultHooksPath(): string {
  return path.join(os.homedir(), '.codex', 'hooks.json');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
