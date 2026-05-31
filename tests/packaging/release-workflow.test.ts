import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

describe('release workflow', () => {
  it('publishes a manually triggered Windows installer release', () => {
    const workflow = read('.github/workflows/release.yml');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('patch');
    expect(workflow).toContain('minor');
    expect(workflow).toContain('major');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('runs-on: windows-latest');
    expect(workflow).toContain('actions/checkout@v4');
    expect(workflow).toContain('actions/setup-node@v4');
    expect(workflow).toContain('node-version: 22');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm version "${{ inputs.version }}" --no-git-tag-version');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run lint');
    expect(workflow).toContain('npm run package:win');
    expect(workflow).toContain('git commit -m "chore(release): v$env:VERSION"');
    expect(workflow).toContain('git tag "v$env:VERSION"');
    expect(workflow).toContain('git push origin HEAD:main');
    expect(workflow).toContain('git push origin "v$env:VERSION"');
    expect(workflow).toContain('gh release create "v$env:VERSION"');
    expect(workflow).toContain('dist/Codex-Light-Setup-$env:VERSION.exe');
    expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
  });
});
