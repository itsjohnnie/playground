import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mondays — Truco',
        short_name: 'Truco',
        description: 'Marcador de Truco para la mesa de los lunes.',
        theme_color: '#13261C',
        background_color: '#13261C',
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
