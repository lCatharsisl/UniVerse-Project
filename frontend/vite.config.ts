import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'masked-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512x512.png'],
      devOptions: {
        enabled: false,
        type: 'module',
      },
      manifest: {
        name: 'UniVerse',
        short_name: 'UniVerse',
        description: 'University Campus Companion App',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#c8102e',
        categories: ['education', 'social', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  esbuild: {
    legalComments: 'none',  // strip license comments from output for smaller bundles
    target: 'esnext',
  },
  build: {
    target: 'esnext',           // modern browsers, smaller output
    cssCodeSplit: true,         // already default but be explicit
    reportCompressedSize: false, // faster build (don't compute gzip sizes during dev build)
    rollupOptions: {
      output: {
        generatedCode: {
          preset: 'es2015',
          arrowFunctions: true,
          constBindings: true,
          objectShorthand: true,
          reservedNamesAsProps: true,
          symbols: true,
        },
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react-icons')) return 'icons'
          if (id.includes('framer-motion')) return 'motion'
          if (
            id.includes('i18next') ||
            id.includes('react-i18next')
          ) {
            return 'i18n'
          }
          if (
            id.includes('react-router') ||
            id.includes('@remix-run')
          ) {
            return 'router'
          }
          if (
            id.includes('formik') ||
            id.includes('yup') ||
            id.includes('react-easy-crop')
          ) {
            return 'forms'
          }
          if (id.includes('axios')) return 'api'
          if (
            id.includes('react') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    // Geliştirme sunucusu: mobil/tablet aynı Wi‑Fi’den PC IP’siyle bağlanabilsin (sadece `npm run dev` yeter).
    ...(command === 'serve' ? { host: '0.0.0.0' as const } : {}),
    ...(command === 'serve' && process.env.DEV_LAN === '1' ? { strictPort: true } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/lost-items': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/found-items': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}))
