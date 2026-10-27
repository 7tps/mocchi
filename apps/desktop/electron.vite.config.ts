import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Workspace packages are TypeScript source, so they must be bundled rather than externalized.
const workspace = ['@jc/app-core', '@jc/design-system', '@jc/japanese-content', '@jc/learning-engine', '@jc/shared-types', '@jc/shared-utils'];

export default defineConfig({
  main: {
    build: {
      externalizeDeps: { exclude: workspace },
      rollupOptions: { input: { index: resolve(__dirname, 'src/main/index.ts') }, external: ['node:sqlite'] },
    },
  },
  preload: {
    build: {
      externalizeDeps: { exclude: workspace },
      rollupOptions: { input: { index: resolve(__dirname, 'src/preload/index.ts') } },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/renderer/index.html') } } },
  },
});
