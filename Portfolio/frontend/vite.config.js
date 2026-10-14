import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Forward /api and /media to Django so the browser sees one origin (no CORS) in dev and preview.
// changeOrigin stays false: Django must see the browser's Host (e.g. localhost:5173) so the image URLs
// it builds point back through this proxy, not at an internal name like backend:8000.
const target = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8000'
const apiProxy = {
  '/api': { target, changeOrigin: false },
  // Uploaded images in development (production serves them from object storage).
  '/media': { target, changeOrigin: false },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
