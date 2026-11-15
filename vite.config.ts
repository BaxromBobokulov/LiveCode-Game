import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Engine + store tests are pure logic, so no DOM environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
