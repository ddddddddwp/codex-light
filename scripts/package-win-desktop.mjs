/* global console */

import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const outArgIndex = args.indexOf('--out');
if (outArgIndex >= 0 && !args[outArgIndex + 1]) {
  throw new Error('缺少 --out 的目录参数。');
}
const outputDir = outArgIndex >= 0 ? path.resolve(args[outArgIndex + 1] ?? '') : getDefaultOutputDir();

if (!outputDir) {
  throw new Error('无法确定输出目录。请使用 --out <目录> 或设置 CODEX_LIGHT_OUT_DIR。');
}

checkPackagingEnvironment();
mkdirSync(outputDir, { recursive: true });

if (skipBuild) {
  console.warn('跳过 build，仅复用现有 dist。请确认 dist 已经是最新源码生成的结果。');
  run('npx', ['electron-builder', '--win', '--x64', '--publish', 'never']);
} else {
  run('npm', ['run', 'package:win', '--', '--publish', 'never']);
}

const version = packageJson.version;
const artifacts = [
  `Codex-Light-Setup-${version}.exe`,
  `Codex-Light-Setup-${version}.exe.blockmap`,
  'latest.yml',
];

for (const artifact of artifacts) {
  const source = path.join(rootDir, 'dist', artifact);
  if (!existsSync(source)) {
    throw new Error(`缺少打包产物：${source}`);
  }

  const stats = statSync(source);
  if (artifact.endsWith('.exe') && stats.size < 10 * 1024 * 1024) {
    throw new Error(`安装器体积异常，可能是半成品：${source}`);
  }

  const target = path.join(outputDir, artifact);
  copyFileSync(source, target);
  console.log(`已复制 ${artifact} (${formatBytes(stats.size)}) -> ${target}`);
}

console.log(`Codex Light ${version} Windows 安装包已输出到：${outputDir}`);

function run(command, commandArgs) {
  console.log(`> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`命令失败：${command} ${commandArgs.join(' ')}`);
  }
}

function getDefaultOutputDir() {
  if (process.env.CODEX_LIGHT_OUT_DIR) {
    return path.resolve(process.env.CODEX_LIGHT_OUT_DIR);
  }

  if (process.platform === 'win32') {
    return path.join(homedir(), 'Desktop', 'codexlight');
  }

  const requestedDesktop = '/mnt/c/Users/d/Desktop';
  if (existsSync(requestedDesktop)) {
    return path.join(requestedDesktop, 'codexlight');
  }

  const usersRoot = '/mnt/c/Users';
  if (existsSync(usersRoot)) {
    const firstDesktop = readdirSync(usersRoot)
      .map((name) => path.join(usersRoot, name, 'Desktop'))
      .find((desktop) => existsSync(desktop));
    if (firstDesktop) {
      return path.join(firstDesktop, 'codexlight');
    }
  }

  return path.join(homedir(), 'Desktop', 'codexlight');
}

function checkPackagingEnvironment() {
  if (process.platform !== 'linux') {
    return;
  }

  if (!commandExists('wine')) {
    throw new Error(
      [
        '当前 Linux/WSL 环境缺少 wine，无法生成 Windows NSIS 安装器。',
        'Ubuntu/WSL 可执行：sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine64 wine32',
      ].join('\n'),
    );
  }

  if (commandExists('dpkg-query') && !debianPackageInstalled('wine32:i386')) {
    throw new Error(
      [
        '当前环境缺少 wine32:i386，electron-builder 生成 Windows 安装器时会失败。',
        '可执行：sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine32',
      ].join('\n'),
    );
  }
}

function commandExists(command) {
  return spawnSync(command, ['--version'], {
    cwd: rootDir,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).status === 0;
}

function debianPackageInstalled(name) {
  const result = spawnSync('dpkg-query', ['-W', '-f=${Status}', name], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return result.status === 0 && result.stdout.includes('install ok installed');
}

function formatBytes(bytes) {
  const mib = bytes / 1024 / 1024;
  return `${mib.toFixed(1)} MB`;
}
