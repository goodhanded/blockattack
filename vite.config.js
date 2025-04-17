// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for deployment
  base: './',
  
  // Configure the build output
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },

  // Configure the development server
  server: {
    port: 3000,
    open: true, // Auto-open browser when starting dev server
  }
});