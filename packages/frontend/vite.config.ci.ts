import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CI-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        // Force localhost for CI environment
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Temporarily disable minification for debugging
    minify: false,
    // Enable source maps for debugging
    sourcemap: true,
    // Ensure no eval() calls in production bundle
    rollupOptions: {
      output: {
        // Prevent dynamic imports that might use eval
        format: 'es',
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});