#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { aggregateSessions, expireStaleCliSessions, normalizeHookPayload } from '../core/normalize';
import { getRuntimeDir } from '../core/runtime-paths';
import { appendEvent, readEvents, writeSnapshotAtomic } from '../core/storage';
import { doctor } from './doctor';
import { installHooks } from './install-hooks';

export async function handleHookInput(input: string, runtimeDir = getRuntimeDir()): Promise<number> {
  try {
    const parsed = JSON.parse(input);
    const event = normalizeHookPayload(parsed);
    await appendEvent(runtimeDir, event);
    const events = await readEvents(runtimeDir);
    const now = new Date();
    await writeSnapshotAtomic(runtimeDir, expireStaleCliSessions(aggregateSessions(events, now), now));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const program = new Command();
  program.name('codex-light');

  program
    .command('hook')
    .description('Record one Codex hook payload from stdin.')
    .action(async () => {
      const code = await handleHookInput(await readStdin());
      process.exitCode = code;
    });

  program
    .command('install-hooks')
    .option('--config <path>', 'Codex config path override')
    .option('--hook-command <command>', 'Command Codex should run')
    .action(async (options: { config?: string; hookCommand?: string }) => {
      const configPath = await installHooks(options);
      console.log(`Installed Codex Light hooks in ${configPath}`);
    });

  program
    .command('doctor')
    .option('--config <path>', 'Codex config path override')
    .option('--hook-executable <path>', 'Hook executable path to check')
    .option('--runtime-dir <path>', 'Runtime directory override')
    .action(async (options: { config?: string; hookExecutable?: string; runtimeDir?: string }) => {
      const report = await doctor(options);
      console.log(JSON.stringify(report, null, 2));
    });

  await program.parseAsync(process.argv);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
