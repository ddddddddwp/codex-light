import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/hook-cli/index.ts',
    target: 'node22',
    outDir: 'dist/hook-cli',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'node:child_process',
        'node:fs/promises',
        'node:os',
        'node:path',
        'node:process',
        'node:util'
      ],
      output: {
        entryFileNames: 'index.js',
        format: 'es'
      }
    }
  }
});
