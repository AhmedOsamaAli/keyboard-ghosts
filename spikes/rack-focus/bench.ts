// Frame-time benchmark for the rack focus spike. Run from the repo root:  node spikes/rack-focus/bench.ts
// Starts its own Vite server on port 5183, so stop any other server on that port first.
// While the page runs a script (30 Tab presses 120 ms apart, a wheel step every 100 ms) it records rAF deltas in the page.
// Writes every run to spikes/rack-focus/bench-results.json.

import { writeFileSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { createServer } from 'vite';

const BASE = 'http://localhost:5183/keyboard-ghosts/spikes/rack-focus/';
const VERSIONS = ['round1.html', 'index.html'] as const;
const TIERS = (process.env['TIERS'] ?? '2,1,0').split(',').map(Number);
const MODES = (process.env['MODES'] ?? 'normal,no-gpu,cpu-x4').split(',');
const RUNS = Number(process.env['RUNS'] ?? 5);

type Row = { mode: string; version: string; tier: number; run: number; n: number; median: number; p95: number; p99: number; max: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function measure(browser: Browser, mode: string, version: string, tier: number, run: number): Promise<Row> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${version}?tier=${tier}`);
  await page.waitForFunction(() => '__rack' in window);
  if (mode === 'cpu-x4') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.waitForTimeout(600);
  await page.mouse.move(640, 360);
  await page.evaluate(() => {
    const w = window as unknown as { __dts: number[]; __stop: boolean };
    w.__dts = [];
    w.__stop = false;
    let last = 0;
    const step = (now: number) => {
      if (last) w.__dts.push(now - last);
      last = now;
      if (!w.__stop) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const tabs = (async () => {
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await sleep(120);
    }
  })();
  const wheels = (async () => {
    for (let i = 0; i < 36; i++) {
      await page.mouse.wheel(0, Math.floor(i / 9) % 2 ? -80 : 80);
      await sleep(100);
    }
  })();
  await Promise.all([tabs, wheels]);
  const dts = await page.evaluate(() => {
    const w = window as unknown as { __dts: number[]; __stop: boolean };
    w.__stop = true;
    return w.__dts;
  });
  await context.close();
  const s = [...dts].sort((a, b) => a - b);
  const pct = (p: number) => s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] as number;
  return { mode, version, tier, run, n: s.length, median: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: s[s.length - 1] as number };
}

const server = await createServer({ server: { port: 5183, strictPort: true }, logLevel: 'error' });
await server.listen();
const rows: Row[] = [];
try {
  for (const mode of MODES) {
    const browser = await chromium.launch({ channel: 'chrome', args: mode === 'no-gpu' ? ['--disable-gpu'] : [] });
    for (let run = 1; run <= RUNS; run++) {
      for (const tier of TIERS) {
        for (const version of VERSIONS) {
          const row = await measure(browser, mode, version, tier, run);
          rows.push(row);
          console.log(`${mode} run${run} tier${tier} ${version.padEnd(11)} n=${row.n} med=${row.median.toFixed(1)} p95=${row.p95.toFixed(1)} p99=${row.p99.toFixed(1)} max=${row.max.toFixed(1)}`);
        }
      }
      writeFileSync(process.env['OUT'] ?? 'spikes/rack-focus/bench-results.json', JSON.stringify(rows, null, 1));
    }
    await browser.close();
  }
} finally {
  await server.close();
}

process.exit(0); // the Vite server can keep the process alive after close()
