import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/index';
import { bedGainDb, oneShotGainDb } from '../../../src/audio/levels';
import { fireBuffer, tickBuffer } from '../../../src/audio/voices/buffers';
import { VOICE_DEFAULTS } from '../../../src/audio/voices/params';
import { crestFactorDb, peak } from '../../../src/audio/analysis';

describe('levels', () => {
  it('turns a final level into a gain', () => {
    expect(oneShotGainDb(-12)).toBe(-3);
    expect(oneShotGainDb(-9)).toBe(0);
    expect(bedGainDb(-33, -20)).toBe(-7);
  });
});

describe('buffer voices', () => {
  const SR = 22050;
  it('makes a click and a loop of ticks', () => {
    const one = tickBuffer(createRng(1), SR, VOICE_DEFAULTS['clock-tick']);
    expect(one.length).toBeLessThan(0.04 * SR);
    expect(peak(one)).toBeGreaterThan(0.1);
    const loop = tickBuffer(createRng(1), SR, VOICE_DEFAULTS['clock-tick'], 5);
    expect(loop).toHaveLength(5 * SR);
    expect(peak(loop)).toBeGreaterThan(0.1);
  });

  it('makes a fire with a high crest factor, repeatable for a seed', () => {
    const a = fireBuffer(createRng(2), SR, 6, VOICE_DEFAULTS.fire);
    expect(crestFactorDb(a)).toBeGreaterThan(12);
    expect(a).toEqual(fireBuffer(createRng(2), SR, 6, VOICE_DEFAULTS.fire));
  });
});
