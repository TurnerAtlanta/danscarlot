
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './client/src/index.html'  // Your React app entry
      }
    }
  },
  server: {
    port: 5173
  }
})
