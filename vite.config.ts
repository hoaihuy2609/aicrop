
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Quan trọng cho GitHub Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext' // Support top-level await
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext' // Support top-level await in dev
    }
  }
});
