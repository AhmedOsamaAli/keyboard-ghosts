import { expect, test } from '@playwright/test';
import { measureVoice, openPage, renderEngine } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B5: the same seed gives bitwise identical buffers. A different seed gives different ones.
const ALL = [
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
/** Voices that draw random numbers. The others are pure tones and need no seed. */
const RANDOM = [
  'tap',
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
  'murmur',
  'riser',
];

test('B5 every voice repeats for the same seed', async ({ page }) => {
  await openPage(page);
  for (const voice of ALL) {
    const a = await measureVoice(page, voice, { seed: 4 });
    const b = await measureVoice(page, voice, { seed: 4 });
    expect(b.hash, voice).toBe(a.hash);
  }
});

test('B5 every voice that uses random numbers changes with the seed', async ({ page }) => {
  await openPage(page);
  for (const voice of RANDOM) {
    const a = await measureVoice(page, voice, { seed: 4 });
    const b = await measureVoice(page, voice, { seed: 5 });
    expect(b.hash, voice).not.toBe(a.hash);
  }
});

test('B5 a whole chapter (beds, events, variation) repeats for a seed and changes with another', async ({
  page,
}) => {
  await openPage(page);
  const run = (seed: number) =>
    renderEngine(page, {
      seconds: 6,
      chapter: 'attic',
      seed,
      beds: true,
      variation: true,
      plays: [
        { event: 'tab-tick', at: 0.5 },
        { event: 'light-dies', at: 1 },
        { event: 'thunder', at: 2 },
        { event: 'repair', at: 3.5 },
      ],
    });
  const a = await run(11);
  const b = await run(11);
  const c = await run(12);
  expect(b.hash).toBe(a.hash);
  expect(c.hash).not.toBe(a.hash);
});
