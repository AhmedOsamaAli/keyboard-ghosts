import { expect, test } from '@playwright/test';
import { SAMPLE_RATE, URLS, openPage, renderEngine } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B3: the focus filter. Pink noise through the chain is much duller when the light is dim, the
// repair chime on the stinger bus is not affected, and a beat of near silence follows light-dies.

interface Bands {
  high: number;
  low: number;
}

async function bands(
  page: import('@playwright/test').Page,
  bus: 'world' | 'stinger',
  dim: boolean,
): Promise<Bands> {
  return page.evaluate(
    async ({ bus, dim, urls, sr }) => {
      const chainMod = (await import(
        /* @vite-ignore */ urls.chain
      )) as typeof import('../../../src/audio/graph/chain');
      const noise = (await import(
        /* @vite-ignore */ urls.noise
      )) as typeof import('../../../src/audio/noise');
      const voices = (await import(
        /* @vite-ignore */ urls.voices
      )) as typeof import('../../../src/audio/voices/index');
      const params = (await import(
        /* @vite-ignore */ urls.params
      )) as typeof import('../../../src/audio/voices/params');
      const a = (await import(
        /* @vite-ignore */ urls.analysis
      )) as typeof import('../../../src/audio/analysis');
      const engine = (await import(
        /* @vite-ignore */ urls.engine
      )) as typeof import('../../../src/engine/index');
      const seconds = 4;
      const ctx = new OfflineAudioContext(1, sr * seconds, sr);
      const chain = chainMod.createChain(ctx);
      chain.room.setRoom(0.9, engine.createRng(5));
      const into = bus === 'world' ? chain.worldBus : chain.stingerBus;
      if (bus === 'world') {
        const buffer = ctx.createBuffer(1, sr * seconds, sr);
        buffer.copyToChannel(
          noise.pinkNoise(engine.createRng(3), sr * seconds) as Float32Array<ArrayBuffer>,
          0,
        );
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(into);
        src.start(0);
      } else {
        voices.VOICE_BUILDERS.chime(ctx, into, 0, params.settingsFor('chime'), engine.createRng(3));
      }
      if (dim) chain.closeFocus(0);
      const x = (await ctx.startRendering()).getChannelData(0).slice(sr);
      const s = a.spectrum(x, sr, 8192);
      return { high: a.bandEnergyDb(s, 2000, 20000), low: a.bandEnergyDb(s, 50, 2000) };
    },
    { bus, dim, urls: URLS, sr: SAMPLE_RATE },
  );
}

test('B3 pink noise is at least 20 dB quieter above 2 kHz when the light is dim', async ({
  page,
}) => {
  await openPage(page);
  const lit = await bands(page, 'world', false);
  const dim = await bands(page, 'world', true);
  expect(lit.high - dim.high).toBeGreaterThanOrEqual(20);
});

test('B3 the repair chime on the stinger bus is not affected by the filter', async ({ page }) => {
  await openPage(page);
  const lit = await bands(page, 'stinger', false);
  const dim = await bands(page, 'stinger', true);
  expect(Math.abs(lit.high - dim.high)).toBeLessThan(0.5);
  expect(Math.abs(lit.low - dim.low)).toBeLessThan(0.5);
});

test('B3 light-dies leaves a beat of near silence before the breath', async ({ page }) => {
  await openPage(page);
  const r = await renderEngine(page, {
    seconds: 5,
    plays: [{ event: 'light-dies', at: 0 }],
    windows: [
      { from: 0.1, to: 0.35 },
      { from: 0.4, to: 5 },
    ],
  });
  const [beat, breath] = r.windows;
  expect(breath?.maxRmsDb).toBeGreaterThan(-60);
  expect((beat?.rmsDb ?? 0) + 12).toBeLessThanOrEqual(breath?.maxRmsDb ?? 0);
});
