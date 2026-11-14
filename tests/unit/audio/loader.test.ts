import { describe, expect, it } from 'vitest';
import { loadSamples, loaderPlan, samplesOf } from '../../../src/audio/loader';
import type { SoundSet } from '../../../src/audio/schema';

const withSample = (id: string): SoundSet => ({
  room: 1,
  beds: [
    {
      id: 'a',
      voice: 'wind',
      levelDb: -33,
      loopSeconds: 47,
      fadeIn: 2,
      fadeOut: 2,
      caption: '[wind blows]',
      sample: id,
    },
  ],
  events: [
    {
      id: 'repair',
      caption: '[a chime rings]',
      steps: [{ voice: 'chime', bus: 'stinger', levelDb: -9, at: 0, sample: `${id}-chime` }],
    },
  ],
  needsSample: [],
});
const sets = { porch: withSample('porch-wind'), foyer: withSample('foyer-wind') };

describe('loader', () => {
  it('lists the samples of one set once', () => {
    expect(samplesOf(sets.porch)).toEqual(['porch-wind', 'porch-wind-chime']);
  });

  it('is empty when sound is off', () => {
    expect(loaderPlan('porch', false, sets, ['shared'])).toEqual([]);
  });

  it('holds one chapter and the shared ids', () => {
    expect(loaderPlan('porch', true, sets, ['shared'])).toEqual([
      'porch-wind',
      'porch-wind-chime',
      'shared',
    ]);
    expect(loaderPlan('gallery', true, sets)).toEqual([]);
  });

  it('fetches only what is planned and skips a failure', async () => {
    const seen: string[] = [];
    const fake = async (url: string) => {
      seen.push(url);
      if (url.includes('bad')) throw new Error('offline');
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    };
    const out = await loadSamples(['a', 'bad'], fake, (id) => `/s/${id}`);
    expect(seen).toEqual(['/s/a', '/s/bad']);
    expect([...out.keys()]).toEqual(['a']);
  });
});
