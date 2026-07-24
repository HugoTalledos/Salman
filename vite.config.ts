import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const config = {
  plugins: [react()],
  server: {
    proxy: {
      // La UI habla solo con la API local; el servidor es quien toca el disco.
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environmentMatchGlobs: [["src/ui/**/*.test.tsx", "jsdom"]],
  },
}

// https://vite.dev/config/
export default defineConfig(config)
