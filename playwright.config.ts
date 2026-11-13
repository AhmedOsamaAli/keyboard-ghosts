import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:5183/keyboard-ghosts/' },
  projects: [
    {
      name: 'chromium',
      // Local runs use the installed Google Chrome (Playwright's download is blocked); CI keeps Playwright's Chromium.
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183/keyboard-ghosts/',
    reuseExistingServer: false,
  },
});
