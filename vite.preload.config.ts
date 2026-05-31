import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/main/preload.ts',
    target: 'node22',
    outDir: 'dist/preload',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: 'preload.cjs',
        format: 'cjs'
      }
    }
  }
});
