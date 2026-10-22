import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * Yeni React uygulaması (SPA). Klasik arayüzün derlemesinden (vite.config.ts) sonra
 * çalışır ve çıktısını `generated/app/` altına yazar. FastAPI `/`, `/bugun`, `/kesfet`
 * gibi rotalarda bu klasördeki `index.html` dosyasını sunar.
 */
export default defineConfig({
  root: resolve(configDir, 'src/spa'),
  base: '/static/generated/app/',
  publicDir: resolve(configDir, 'public'),
  plugins: [react()],
  build: {
    outDir: resolve(configDir, '../backend/app/static/generated/app'),
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
