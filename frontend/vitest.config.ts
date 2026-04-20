/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Keep Playwright E2E specs (tests/e2e/*.spec.ts) out of the Vitest
    // runner — they use @playwright/test and crash under Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
})
