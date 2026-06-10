import { defineConfig, devices } from '@playwright/test';

// E2E against a running stack. Bring it up first:  pnpm stack:up
// Then:  pnpm -C frontend test:e2e   (after `pnpm exec playwright install chromium`)
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  // Uses the system Google Chrome (channel) — works where Playwright's bundled
  // browsers aren't available. Drop the channel to use the bundled chromium.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
