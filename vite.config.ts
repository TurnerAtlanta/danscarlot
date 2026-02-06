
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    cloudflare({
    })
  ],
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    sourcemap: true,
    main: 'public/index.html'
      },
  resolve: {
    alias: {
         '@': '/src'
        },
      },
  preview: {
    port: 8788
  }
});
