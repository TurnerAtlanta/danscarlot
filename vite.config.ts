import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html')
      }
    },
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    // Add for Cloudflare: chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src')
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    // Proxy for Cloudflare/D1 APIs if needed
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Your Workers port
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  // Optimize deps for Cloudflare edge
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
