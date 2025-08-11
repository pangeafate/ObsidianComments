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
  preview: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://backend:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable minification for production
    minify: true,
    // Disable source maps for production security
    sourcemap: false,
    // Optimize bundle splitting for better caching
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          utils: ['axios', 'dompurify']
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});