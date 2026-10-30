import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Silent update: the new worker installs, skips waiting and takes over, so the next load
      // already runs the new build. No "reload" prompt UI to maintain for a read-only site.
      registerType: 'autoUpdate',
      // public/manifest.json is the manifest (already linked from index.html).
      manifest: false,
      includeManifestIcons: false,
      workbox: {
        // Shell + every built chunk (lazy routes included) + static assets.
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,json}'],
        cleanupOutdatedCaches: true,
        // SPA fallback, but never for the server-side routes.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/\.netlify\//],
        runtimeCaching: [
          {
            // Live book data (BooksContext, DrawBook): last successful response shows offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/.netlify/functions/books'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'books-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              /^books\.google\.[a-z.]+$/.test(url.hostname) ||
              url.hostname === 'covers.openlibrary.org' ||
              url.hostname.endsWith('.googleusercontent.com'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'book-covers',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              // 0 = opaque cross-origin image responses (no CORS headers).
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
