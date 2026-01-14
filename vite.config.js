import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Proxy API requests to backend server during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Build configuration for production
  build: {
    outDir: 'dist',
    sourcemap: false // Disable sourcemaps in production for security
  }
})
