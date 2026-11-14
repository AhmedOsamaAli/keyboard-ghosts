import { expect, test } from '@playwright/test';
import { CEILING_DB, measureVoice, openPage } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B1: every voice renders finite, not silent, under the ceiling, with no DC offset.
const VOICES = [
  'tap',
  'chime',
  'glass-ring',
  'clock-chime',
  'church-bell',
  'clock-tick',
  'breath',
  'whoosh',
  'wind',
  'wind-gaps',
  'room-tone',
  'fire',
  'rain-roof',
  'thunder',
  'floor-creak',
  'door-creak',
  'big-door',
  'chains',
  'bars',
  'chord',
  'murmur',
  'drip',
  'music-box',
  'drone',
  'riser',
  'heartbeat',
];

for (const voice of VOICES) {
  test(`B1 ${voice} renders finite, audible, under the ceiling, no DC`, async ({ page }) => {
    await openPage(page);
    const r = await measureVoice(page, voice);
    expect(r.finite).toBe(true);
    expect(r.rmsDb).toBeGreaterThan(-60);
    expect(r.peakDb).toBeLessThanOrEqual(CEILING_DB);
    expect(Math.abs(r.dc)).toBeLessThan(0.01);
  });
}

test('B1 the room impulse of every chapter is finite and not silent', async ({ page }) => {
  await openPage(page);
  const report = await page.evaluate(async () => {
    const base = '/keyboard-ghosts/src';
    const imp = (await import(
      /* @vite-ignore */ `${base}/audio/impulse.ts`
    )) as typeof import('../../../src/audio/impulse');
    const a = (await import(
      /* @vite-ignore */ `${base}/audio/analysis.ts`
    )) as typeof import('../../../src/audio/analysis');
    const engine = (await import(
      /* @vite-ignore */ `${base}/engine/index.ts`
    )) as typeof import('../../../src/engine/index');
    return Object.entries(imp.ROOM_SECONDS).map(([chapter, seconds]) => {
      const x = imp.generateImpulse(seconds, 44100, engine.createRng(1));
      return { chapter, finite: a.allFinite(x), peakDb: a.peakDb(x), dc: a.dcOffset(x) };
    });
  });
  expect(report).toHaveLength(7);
  for (const r of report) {
    expect(r.finite).toBe(true);
    expect(r.peakDb).toBeGreaterThan(-20);
    expect(Math.abs(r.dc)).toBeLessThan(0.01);
  }
});
