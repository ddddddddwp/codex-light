import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('renderer packaging', () => {
  it('uses relative asset paths so file:// packaged apps can load JS and CSS', () => {
    const config = fs.readFileSync('vite.renderer.config.ts', 'utf8');

    expect(config).toContain("base: './'");
  });
});
