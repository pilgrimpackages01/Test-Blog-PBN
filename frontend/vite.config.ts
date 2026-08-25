import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Common proxy configuration for dev and preview
  const proxyConfig = {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true
    },
    '/admin': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true
    }
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: proxyConfig
    },
    preview: {
      proxy: proxyConfig
    }
  };
});
