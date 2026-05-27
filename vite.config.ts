import { defineConfig } from 'vite';
import { realpathSync } from 'node:fs';

export default defineConfig({
  root: realpathSync(process.cwd()),
  resolve: {
    alias: {
      phaser: 'phaser/dist/phaser.esm.js',
    },
  },
  optimizeDeps: {
    exclude: ['phaser'],
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

