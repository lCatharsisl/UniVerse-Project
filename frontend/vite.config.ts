import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'UniVerse',
        short_name: 'UniVerse',
        description: 'University Campus Companion App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
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
})
