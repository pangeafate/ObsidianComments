import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://backend:8081',
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