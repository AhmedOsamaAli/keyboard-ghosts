import { expect, test } from '@playwright/test';
import { measureVoice, openPage, type VoiceReport } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B2: every voice meets its target from section 5 of the brief (wide tolerances).
// Lengths are the time until the loudness is 50 dB under its peak.
type Check = (r: VoiceReport) => void;

const between = (value: number, lo: number, hi: number): void => {
  expect(value).toBeGreaterThanOrEqual(lo);
  expect(value).toBeLessThanOrEqual(hi);
};

/** Each partial is found within `tol` of ratio * fundamental, and stands out of the noise floor. */
function partials(fundamental: number, ratios: number[], tol: number): Check {
  return (r) =>
    ratios.forEach((ratio, i) => {
      const hit = r.peaks[i];
      expect(hit, `partial ${ratio}`).not.toBeNull();
      expect(Math.abs((hit?.freqHz ?? 0) / (fundamental * ratio) - 1)).toBeLessThanOrEqual(tol);
      expect(hit?.prominenceDb ?? 0).toBeGreaterThan(15);
    });
}

interface Target {
  freqs?: number[];
  window?: number;
  check: Check;
}

const BELL = [1, 2.76, 5.4, 8.93];
const GLASS = [1, 2.32, 4.25, 6.63, 9.38];
const BOX = [1, 6.27, 17.55];

const TARGETS: Record<string, Target> = {
  tap: {
    check: (r) => {
      expect(r.length50).toBeLessThanOrEqual(0.15);
      between(r.centroid, 600, 2500);
    },
  },
  chime: {
    freqs: BELL.map((x) => x * 660),
    check: (r) => {
      between(r.length50, 1.5, 3);
      partials(660, BELL, 0.02)(r);
    },
  },
  'glass-ring': {
    freqs: GLASS.map((x) => x * 880),
    check: partials(880, GLASS, 0.02),
  },
  'clock-chime': { check: (r) => between(r.length50, 1.2, 2.5) },
  'church-bell': {
    check: (r) => {
      between(r.length50, 4, 7);
      expect(r.low400).toBeGreaterThan(0.6);
    },
  },
  'clock-tick': { check: (r) => expect(r.length50).toBeLessThanOrEqual(0.04) },
  breath: {
    check: (r) => {
      between(r.peakTime, 0.7, 1.2);
      between(r.endCentroid, 250, 400);
    },
  },
  whoosh: { check: (r) => between(r.length50, 0.5, 1.2) },
  wind: { check: (r) => between(r.centroid, 250, 1200) },
  'wind-gaps': { check: (r) => between(r.centroid, 600, 2000) },
  'room-tone': { check: (r) => expect(r.centroid).toBeLessThan(500) },
  fire: { check: (r) => expect(r.crestDb).toBeGreaterThanOrEqual(12) },
  'rain-roof': { check: (r) => between(r.centroid, 2500, 6000) },
  thunder: {
    check: (r) => {
      between(r.length50, 3, 6);
      expect(r.low150).toBeGreaterThan(0.6);
    },
  },
  'floor-creak': {
    check: (r) => {
      between(r.length50, 0.4, 1.5);
      between(r.modRate, 8, 25);
    },
  },
  'door-creak': {
    check: (r) => {
      between(r.length50, 0.4, 1.5);
      between(r.modRate, 8, 25);
    },
  },
  'big-door': { check: (r) => between(r.length50, 0.8, 2) },
  chains: { check: (r) => expect(r.centroid).toBeGreaterThan(2000) },
  bars: {
    check: (r) => {
      between(r.length50, 0.8, 1.6);
      expect(r.centroid).toBeGreaterThan(1200);
    },
  },
  chord: {
    freqs: [220, 275, 330],
    check: (r) => {
      between(r.length50, 1.5, 3.5);
      const [a, b, c] = r.peaks;
      expect(a && b && c).toBeTruthy();
      expect(Math.abs((b?.freqHz ?? 0) / (a?.freqHz ?? 1) / 1.25 - 1)).toBeLessThanOrEqual(0.02);
      expect(Math.abs((c?.freqHz ?? 0) / (a?.freqHz ?? 1) / 1.5 - 1)).toBeLessThanOrEqual(0.02);
    },
  },
  murmur: {
    check: (r) => {
      between(r.centroid, 400, 1400);
      between(r.modRate, 2, 6);
    },
  },
  drip: { check: (r) => expect(r.length50).toBeLessThanOrEqual(0.4) },
  'music-box': {
    freqs: BOX.map((x) => x * 784),
    check: (r) => {
      between(r.length50, 0.6, 1.5);
      partials(784, BOX, 0.03)(r);
    },
  },
  drone: {
    freqs: [55],
    window: 0.05,
    check: (r) => {
      expect(r.centroid).toBeLessThan(400);
      expect(Math.abs((r.peaks[0]?.freqHz ?? 0) / 55 - 1)).toBeLessThanOrEqual(0.03);
    },
  },
  riser: { check: (r) => expect(r.rmsEnd - r.rmsStart).toBeGreaterThanOrEqual(10) },
  heartbeat: { check: (r) => expect(r.low150).toBeGreaterThan(0.9) },
};

for (const [voice, target] of Object.entries(TARGETS)) {
  test(`B2 ${voice} meets its target`, async ({ page }) => {
    await openPage(page);
    const report = await measureVoice(page, voice, {
      ...(target.freqs ? { freqs: target.freqs } : {}),
      ...(target.window ? { window: target.window } : {}),
    });
    target.check(report);
  });
}

test('B2 the room impulse decays within 25% of every chapter room time', async ({ page }) => {
  await openPage(page);
  const rows = await page.evaluate(async () => {
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
    // The impulse is rendered through a convolver, then measured from the output buffer.
    const out: { chapter: string; seconds: number; measured: number }[] = [];
    for (const [chapter, seconds] of Object.entries(imp.ROOM_SECONDS)) {
      const sr = 44100;
      const ctx = new OfflineAudioContext(1, Math.ceil(sr * (seconds * 1.6 + 0.5)), sr);
      const click = ctx.createBuffer(1, 2, sr);
      click.getChannelData(0)[0] = 1;
      const src = ctx.createBufferSource();
      src.buffer = click;
      const conv = ctx.createConvolver();
      conv.normalize = false;
      const ir = ctx.createBuffer(
        1,
        imp.generateImpulse(seconds, sr, engine.createRng(1)).length,
        sr,
      );
      ir.copyToChannel(
        imp.generateImpulse(seconds, sr, engine.createRng(1)) as Float32Array<ArrayBuffer>,
        0,
      );
      conv.buffer = ir;
      src.connect(conv).connect(ctx.destination);
      src.start(0);
      const rendered = (await ctx.startRendering()).getChannelData(0);
      out.push({ chapter, seconds, measured: a.rt60(rendered, sr) });
    }
    return out;
  });
  for (const r of rows) {
    expect(r.measured, r.chapter).toBeGreaterThan(r.seconds * 0.75);
    expect(r.measured, r.chapter).toBeLessThan(r.seconds * 1.25);
  }
});
