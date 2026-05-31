import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { installHooks } from '../../src/hook-cli/install-hooks';

describe('installHooks', () => {
  it('adds one Codex Light block and preserves existing hooks', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-light-hooks-'));
    const config = path.join(dir, 'hooks.json');
    await fs.writeFile(config, JSON.stringify({
      hooks: {
        Stop: [
          {
            description: 'User hook',
            hooks: [{ type: 'command', command: 'echo done' }]
          }
        ]
      }
    }), 'utf8');

    await installHooks({ config, hookCommand: 'codex-light hook' });
    await installHooks({ config, hookCommand: 'codex-light hook' });

    const updated = JSON.parse(await fs.readFile(config, 'utf8')) as {
      hooks: Record<string, Array<{ description?: string; hooks: unknown[] }>>;
    };
    const codexLightStopBlocks = updated.hooks.Stop.filter((group) => group.description === 'Codex Light generated hook block');

    expect(updated.hooks.Stop.some((group) => group.description === 'User hook')).toBe(true);
    expect(codexLightStopBlocks).toHaveLength(1);
    expect(updated.hooks.PermissionRequest).toHaveLength(1);
  });
});
