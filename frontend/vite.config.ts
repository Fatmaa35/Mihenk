import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * Mihenk React uygulaması. Çıktı `backend/app/static/generated/` altına yazılır;
 * FastAPI `/`, `/bugun`, `/kesfet` gibi rotalarda buradaki `index.html` dosyasını sunar.
 */
export default defineConfig({
  root: resolve(configDir, 'src/spa'),
  base: '/static/generated/',
  publicDir: resolve(configDir, 'public'),
  plugins: [react()],
  build: {
    outDir: resolve(configDir, '../backend/app/static/generated'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
