import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // three.js alone is ~580 kB minified. It sits in its own chunk that only
    // loads after first paint, so the warning's default limit does not apply.
    chunkSizeWarningLimit: 700,
  },
})
