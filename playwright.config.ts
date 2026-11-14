import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

function validPort(text: string | undefined): number | undefined {
  const t = text?.trim();
  if (!t || !/^\d+$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 1 && n <= 65535 ? n : undefined;
}

/** E2E_PORT, else the first line of .local/e2e-port, else 5183. Never 5173 (another project uses it). */
function e2ePort(): number {
  let fromFile: string | undefined;
  try {
    fromFile = readFileSync('.local/e2e-port', 'utf8').split(/\r?\n/)[0];
  } catch {
    fromFile = undefined;
  }
  const port = validPort(process.env.E2E_PORT) ?? validPort(fromFile) ?? 5183;
  if (port === 5173) throw new Error('Port 5173 belongs to another project. Choose another port.');
  return port;
}

const port = e2ePort();
const base = `http://localhost:${port}/keyboard-ghosts/`;

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: base },
  projects: [
    {
      name: 'chromium',
      // Local runs use the installed Google Chrome (Playwright's download is blocked); CI keeps Playwright's Chromium.
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: base,
    reuseExistingServer: false,
  },
});
