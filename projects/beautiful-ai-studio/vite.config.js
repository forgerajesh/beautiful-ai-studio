import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['studio.rajeshforge.com'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
