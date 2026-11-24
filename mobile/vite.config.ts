import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('@capacitor')) return 'vendor-capacitor';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5174,
  }
});
