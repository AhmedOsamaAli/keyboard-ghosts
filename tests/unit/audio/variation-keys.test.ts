import { describe, expect, it } from 'vitest';
import { VOICE_IDS } from '../../../src/audio/schema';
import { VOICE_DEFAULTS } from '../../../src/audio/voices/params';
import { applyVariation, keyKind } from '../../../src/audio/voices/variation-keys';

describe('variation keys', () => {
  it('scales pitch and filter numbers and leaves the rest', () => {
    const s = applyVariation('chime', VOICE_DEFAULTS.chime, 1.02, 1.05);
    expect(s['fundamentalHz']).toBeCloseTo(660 * 1.02, 9);
    expect(s['tailS']).toBe(3);
    const tap = applyVariation('tap', VOICE_DEFAULTS.tap, 1, 1.05);
    expect(tap['bandHz']).toBeCloseTo(1300 * 1.05, 9);
    expect(keyKind('drip', 'fromHz')).toBe('pitch');
    expect(keyKind('whoosh', 'fromHz')).toBe('filter');
  });

  it('keeps every key of every voice', () => {
    for (const id of VOICE_IDS) {
      const s = applyVariation(id, VOICE_DEFAULTS[id], 1.01, 1.01);
      expect(Object.keys(s).sort()).toEqual(Object.keys(VOICE_DEFAULTS[id]).sort());
    }
  });
});
