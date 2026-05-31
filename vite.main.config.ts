import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/main/main.ts',
    target: 'node22',
    outDir: 'dist/main',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: 'main.js',
        format: 'es'
      }
    }
  }
});
