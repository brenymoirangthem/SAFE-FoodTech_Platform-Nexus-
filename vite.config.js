import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push new code
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FoodTech Disaster Relief',
        short_name: 'FoodTech',
        description: 'Emergency supply chain routing and food request platform.',
        theme_color: '#10b981', // Emerald green
        background_color: '#ffffff',
        display: 'standalone', // Makes it look like a native app (no browser bar)
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2769/2769339.png', // Temporary placeholder icon
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2769/2769339.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})