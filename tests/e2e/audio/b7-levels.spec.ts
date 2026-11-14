import { expect, test } from '@playwright/test';
import { SAMPLE_RATE, URLS, openPage } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B7: with variation off and the master at its default, levels at the final output.
// - one-shots peak between -14 and -10 dBFS (tolerance 1.5 dB)
// - the tab tick peaks at -26 dBFS (tolerance 2 dB)
// - stingers (repair, level-solved) peak at -9 dBFS (tolerance 1.5 dB)
// - each chapter's beds together measure -30 dBFS RMS (tolerance 3 dB) over 10 s after the fades
// light-dies plays the breath through the closed focus filter on purpose, so its peak is not a
// one-shot level. The same breath at the same level is measured as ghost-breath (design.md).

const STINGERS = ['repair', 'level-solved'];
const NOT_MEASURED = ['light-dies'];
const CHAPTERS = ['porch', 'foyer', 'chapel', 'gallery', 'library', 'attic', 'finale'];

interface Row {
  chapter: string;
  event: string;
  peakDb: number;
}

for (const chapter of CHAPTERS) {
  test(`B7 ${chapter}: one-shots, the tab tick, stingers and beds sit at their levels`, async ({
    page,
  }) => {
    await openPage(page);
    const result = await page.evaluate(
      async ({ chapter, urls, sr }) => {
        const m = (await import(
          /* @vite-ignore */ urls.audio
        )) as typeof import('../../../src/audio/index');
        const sets = (await import(
          /* @vite-ignore */ urls.sets
        )) as typeof import('../../../src/audio/sets/index');
        const a = (await import(
          /* @vite-ignore */ urls.analysis
        )) as typeof import('../../../src/audio/analysis');
        type Chapter = Parameters<typeof sets.getSet>[0];
        const set = sets.getSet(chapter as Chapter);
        const rows: { chapter: string; event: string; peakDb: number }[] = [];
        for (const event of set.events) {
          const ctx = new OfflineAudioContext(1, sr * 8, sr);
          const audio = m.createAudio({
            seed: 1,
            createContext: () => ctx,
            beds: false,
            variation: false,
          });
          audio.setChapter(chapter as Chapter);
          await audio.enable();
          audio.play(event.id, { at: 0.1 });
          rows.push({
            chapter,
            event: event.id,
            peakDb: a.peakDb((await ctx.startRendering()).getChannelData(0)),
          });
        }
        const fade = Math.max(...set.beds.map((b) => b.fadeIn));
        const ctx = new OfflineAudioContext(1, Math.ceil(sr * (fade + 10)), sr);
        const audio = m.createAudio({ seed: 1, createContext: () => ctx, variation: false });
        audio.setChapter(chapter as Chapter);
        await audio.enable();
        const x = (await ctx.startRendering()).getChannelData(0);
        return { rows, bedsRmsDb: a.rmsDb(x, Math.ceil(sr * fade), x.length) };
      },
      { chapter, urls: URLS, sr: SAMPLE_RATE },
    );

    const report = (r: Row) => `${r.chapter} ${r.event} ${r.peakDb.toFixed(1)} dBFS`;
    for (const row of result.rows) {
      if (NOT_MEASURED.includes(row.event)) continue;
      if (row.event === 'tab-tick') {
        expect(Math.abs(row.peakDb + 26), report(row)).toBeLessThanOrEqual(2);
      } else if (STINGERS.includes(row.event)) {
        expect(Math.abs(row.peakDb + 9), report(row)).toBeLessThanOrEqual(1.5);
      } else {
        expect(row.peakDb, report(row)).toBeGreaterThanOrEqual(-14 - 1.5);
        expect(row.peakDb, report(row)).toBeLessThanOrEqual(-10 + 1.5);
      }
    }
    expect(
      Math.abs(result.bedsRmsDb + 30),
      `${chapter} beds ${result.bedsRmsDb}`,
    ).toBeLessThanOrEqual(3);
  });
}
