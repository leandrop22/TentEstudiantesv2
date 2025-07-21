import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Asegura que las rutas de los assets se resuelvan desde la raíz
  build: {
    outDir: 'dist',
  }
});
