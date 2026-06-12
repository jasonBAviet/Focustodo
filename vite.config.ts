import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Focus Todo',
        short_name: 'Focus',
        description: 'Ung dung quan ly cong viec tap trung va hieu qua',
        theme_color: '#f25f5c',
        background_color: '#141416',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'vi',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'utilities'],
        shortcuts: [
          {
            name: 'Them task moi',
            short_name: 'Task moi',
            description: 'Mo them task moi nhanh chong',
            url: '/?action=new-task',
            icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Chien luoc cache cho tai nguyen tinh: Cache First
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico}'],
        runtimeCaching: [
          {
            // API: Network First - Uu tien doc du lieu moi tu mang
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'focus-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60, // 24 gio
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Font va icon tu CDN: Cache First
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 nam
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        // Tat PWA trong dev mode de tranh xung dot module (duplicate React)
        // PWA chi hoat dong day du trong production build (npm run build)
        enabled: false,
      },
    }),
  ],
  server: {
    port: 8000,
    open: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
