import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

interface PackageJson {
  build?: {
    files?: string[];
  };
}

describe('electron-builder config', () => {
  it('packages only runtime build outputs instead of recursively including installer output', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as PackageJson;

    expect(packageJson.build?.files).toEqual([
      'dist/main/**/*',
      'dist/preload/**/*',
      'dist/hook-cli/**/*',
      'dist/renderer/**/*',
      'package.json'
    ]);
  });
});
