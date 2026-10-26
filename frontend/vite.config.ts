import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // frontend/api/*.ts are Vercel functions whose helpers the SPA imports (e.g. _seo.ts):
        // in dev those are source modules Vite must serve itself, not backend calls.
        bypass: (req) => (/^\/api\/[^?]*\.ts(\?|$)/.test(req.url ?? '') ? req.url : undefined),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':    ['swiper', 'yet-another-react-lightbox'],
          'vendor-misc':  ['axios', 'zustand', 'qrcode'],
        },
      },
    },
  },
});
