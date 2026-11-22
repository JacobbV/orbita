import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// O site é publicado em https://jacobbv.github.io/orbita/, por isso a base é /orbita/.
export default defineConfig({
  base: '/orbita/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
