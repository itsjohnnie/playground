import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // `autoUpdate` alone still parks the new service worker in
      // "waiting" until every open instance is closed — and for a
      // home-screen PWA, backgrounding the app doesn't count, you have
      // to swipe it out of the app switcher. That's why a deploy can
      // look like it "didn't ship". `skipWaiting` activates the new
      // worker as soon as it installs and `clientsClaim` lets it take
      // over the already-open page, so a plain relaunch is enough.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: [
        'favicon-64.png',
        'apple-touch-icon.png',
        'apple-touch-icon-light.png',
        'apple-touch-icon-dark.png',
        'icon.svg',
      ],
      manifest: {
        name: 'MTL Score',
        short_name: 'MTL Score',
        description: 'Marcador de Truco para la mesa de los lunes.',
        theme_color: '#0E1110',
        background_color: '#0E1110',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/playground/truco/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  base: '/playground/truco/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
