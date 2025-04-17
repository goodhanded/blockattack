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
    // Ensure assets are copied to the build directory
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },

  // Configure the development server
  server: {
    port: 3000,
    open: true, // Auto-open browser when starting dev server
  },
  
  // Define public directory for static assets
  publicDir: 'public',
});