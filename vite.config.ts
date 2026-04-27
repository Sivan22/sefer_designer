import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Repo is published at github.com/Sivan22/sefer_designer; GH Pages serves
  // it under /sefer_designer/. Use that base for CI builds; keep root for
  // local dev/preview.
  base: process.env.GITHUB_ACTIONS ? '/sefer_designer/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
