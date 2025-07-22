import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    minify: false,    // Sin minificar para debugging
    sourcemap: true   // Source maps para errores claros
  },
  server: {
    port: 3000
  },
  define: {
    global: 'globalThis',
  }
})