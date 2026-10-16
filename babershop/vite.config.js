import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = Number(process.env.API_PORT || process.env.PORT) || 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
})
