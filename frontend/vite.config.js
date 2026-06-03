import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Netlify injecte NETLIFY=true automatiquement dans l'environnement de build
const isNetlify = process.env.NETLIFY === 'true'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: isNetlify ? '/' : '/static/',
  build: {
    outDir:     isNetlify ? 'dist' : '../backend/frontend_dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
