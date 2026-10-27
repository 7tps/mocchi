import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Browser preview of the renderer. Without Electron, the renderer runs the
 * TutorService in-page with localStorage persistence, which is useful for UI
 * work and demos. Desktop-only features (overlay, tray, idle detection) are
 * simulated or hidden.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  build: { outDir: resolve(__dirname, 'dist-web'), emptyOutDir: true },
});
