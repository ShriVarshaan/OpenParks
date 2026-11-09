import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    // Tests expect the defaults, whatever a developer's frontend/.env says
    // (e.g. a Mailpit inbox moved off a port Windows has reserved).
    env: {
      VITE_MAIL_UI_URL: 'http://localhost:8025',
    },
    include: ['test/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'test/',
      ],
    },
  },
})