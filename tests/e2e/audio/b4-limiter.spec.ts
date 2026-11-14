import { expect, test } from '@playwright/test';
import { CEILING_DB, SAMPLE_RATE, URLS, openPage } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B4: every voice and every bed layer playing at once never goes above -1 dBFS (plus 0.1 dB of
// tolerance for the oversampled clipper), also with the master at 0 dB.
const TOLERANCE_DB = 0.1;

async function everythingAtOnce(
  page: import('@playwright/test').Page,
  masterDb: number,
  bypass: boolean,
): Promise<number> {
  return page.evaluate(
    async ({ masterDb, bypass, urls, sr }) => {
      const chainMod = (await import(
        /* @vite-ignore */ urls.chain
      )) as typeof import('../../../src/audio/graph/chain');
      const voices = (await import(
        /* @vite-ignore */ urls.voices
      )) as typeof import('../../../src/audio/voices/index');
      const params = (await import(
        /* @vite-ignore */ urls.params
      )) as typeof import('../../../src/audio/voices/params');
      const sets = (await import(
        /* @vite-ignore */ urls.sets
      )) as typeof import('../../../src/audio/sets/index');
      const levels = (await import(
        /* @vite-ignore */ urls.levels
      )) as typeof import('../../../src/audio/levels');
      const db = (await import(
        /* @vite-ignore */ urls.db
      )) as typeof import('../../../src/audio/db');
      const a = (await import(
        /* @vite-ignore */ urls.analysis
      )) as typeof import('../../../src/audio/analysis');
      const engine = (await import(
        /* @vite-ignore */ urls.engine
      )) as typeof import('../../../src/engine/index');
      const schema = (await import(
        /* @vite-ignore */ urls.schema
      )) as typeof import('../../../src/audio/schema');
      const ctx = new OfflineAudioContext(1, sr * 6, sr);
      const chain = chainMod.createChain(ctx);
      chain.setMaster(masterDb);
      chain.room.setRoom(3.2, engine.createRng(9));
      const world = bypass ? ctx.destination : chain.worldBus;
      const stinger = bypass ? ctx.destination : chain.stingerBus;
      const beds = bypass ? ctx.destination : chain.bedsBus;
      let n = 0;
      for (const id of schema.VOICE_IDS) {
        voices.VOICE_BUILDERS[id](
          ctx,
          n++ % 2 ? world : stinger,
          0,
          params.settingsFor(id),
          engine.createRng(n),
        );
      }
      for (const chapter of engine.CHAPTER_IDS) {
        for (const layer of sets.getSet(chapter).beds) {
          const settings = params.settingsFor(layer.voice, layer.params);
          const g = ctx.createGain();
          g.gain.value = db.dbToGain(levels.bedGainDb(layer.levelDb, settings['rmsDb'] ?? -20));
          g.connect(beds);
          voices.VOICE_BUILDERS[layer.voice](
            ctx,
            g,
            0,
            settings,
            engine.createRng(++n),
            layer.loopSeconds,
          );
        }
      }
      return a.peakDb((await ctx.startRendering()).getChannelData(0));
    },
    { masterDb, bypass, urls: URLS, sr: SAMPLE_RATE },
  );
}

test('B4 everything at once stays under the ceiling at the default master', async ({ page }) => {
  await openPage(page);
  expect(await everythingAtOnce(page, -6, false)).toBeLessThanOrEqual(CEILING_DB + TOLERANCE_DB);
});

test('B4 everything at once stays under the ceiling with the master at 0 dB', async ({ page }) => {
  await openPage(page);
  expect(await everythingAtOnce(page, 0, false)).toBeLessThanOrEqual(CEILING_DB + TOLERANCE_DB);
});

test('B4 the same sounds without the limiter go over, so the limiter has work to do', async ({
  page,
}) => {
  await openPage(page);
  expect(await everythingAtOnce(page, 0, true)).toBeGreaterThan(0);
});
