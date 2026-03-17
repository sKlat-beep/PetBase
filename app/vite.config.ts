import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(process.env.ANALYZE ? [visualizer({ open: false, filename: 'dist/bundle-stats.html' })] : []),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\//,
              handler: 'NetworkFirst',
              options: { cacheName: 'firestore-cache', networkTimeoutSeconds: 10 },
            },
          ],
        },
        manifest: {
          name: 'PetBase',
          short_name: 'PetBase',
          description: 'Privacy-first pet health and community platform',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 3000,
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase: keep as one chunk — auth/firestore/storage share circular deps
            if (id.includes('firebase')) return 'vendor-firebase';
            // Heavy UI / animation
            if (id.includes('motion')) return 'vendor-motion';
            // PDF generation — lazily loaded, keep separate
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            // H3 geo lib
            if (id.includes('h3-js')) return 'vendor-h3';
            // Image cropping
            if (id.includes('react-easy-crop')) return 'vendor-crop';
            // QR code
            if (id.includes('qrcode')) return 'vendor-qr';
            // Lucide icons — large package, isolate
            if (id.includes('lucide-react')) return 'vendor-icons';
            // React core
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
            // React router
            if (id.includes('react-router')) return 'vendor-router';
          },
        },
      },
    },
  };
});
