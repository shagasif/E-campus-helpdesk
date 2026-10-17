import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser talks to Vite (port 5173). Requests starting with /api are
// forwarded to the Express backend (port 3001), so the API key never
// needs to exist in the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
