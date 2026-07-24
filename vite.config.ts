import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // La UI habla solo con la API local; el servidor es quien toca el disco.
      '/api': 'http://localhost:8787',
    },
  },
})
