import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: resolve(configDir, '../app/static/generated'), emptyOutDir: true,
    lib: { entry: resolve(configDir, 'src/main.tsx'), formats: ['es'], fileName: () => 'product-ui.js' },
    cssCodeSplit: false, rollupOptions: { output: { assetFileNames: 'product-ui.css' } }
  }
})
