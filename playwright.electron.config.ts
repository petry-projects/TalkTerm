import { defineConfig } from '@playwright/test';

/**
 * Playwright config for Electron E2E tests.
 * Tests launch Electron directly via _electron.launch() — no webServer needed.
 * Requires: npx electron-forge make (or npm run dev with .vite/build/main.js present)
 */
export default defineConfig({
  testDir: './test/e2e',
  timeout: 120_000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
  workers: 1, // Serial — Electron tests share app state
});
