import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../..',
  resolve: {
    alias: {
      // Vite bundles the TypeScript sources. Nest consumes the CommonJS build.
      '@thesispartner/types': path.resolve(webRoot, '../../packages/types/src/index.ts'),
      '@thesispartner/validation': path.resolve(webRoot, '../../packages/validation/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/docs': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  },
});
