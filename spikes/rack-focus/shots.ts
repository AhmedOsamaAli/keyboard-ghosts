// Writes before (round 1) and after (round 2) screenshots to spikes/rack-focus/shots/. Run from the repo root:
//   node spikes/rack-focus/shots.ts
// Starts its own Vite server on port 5183, so stop any other server on that port first.

import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const BASE = 'http://localhost:5183/keyboard-ghosts/spikes/rack-focus/';
const TARGETS = [
  ['link', 'a[href="#a4"]'],
  ['input', 'input[name="city"]'],
  ['card', '.cards button:nth-child(3)'],
] as const;
const VERSIONS = [['before', 'round1.html'], ['after', 'index.html']] as const;

mkdirSync('spikes/rack-focus/shots', { recursive: true });
const server = await createServer({ server: { port: 5183, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const tier of [2, 1]) {
    for (const [name, sel] of TARGETS) {
      for (const [label, file] of VERSIONS) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        await page.goto(`${BASE}${file}?tier=${tier}`);
        await page.waitForFunction(() => '__rack' in window);
        for (let i = 0; i < 45; i++) {
          if (await page.evaluate((s) => document.querySelector(s) === document.activeElement, sel)) break;
          await page.keyboard.press('Tab');
          await page.waitForTimeout(60);
        }
        await page.waitForTimeout(1200); // glide, camera and any fades are done
        const out = `spikes/rack-focus/shots/${name}-tier${tier}-${label}.png`;
        await page.screenshot({ path: out });
        console.log(out);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

process.exit(0); // the Vite server can keep the process alive after close()
