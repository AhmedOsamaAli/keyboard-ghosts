import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/index';
import {
  DEFAULT_LIMITS,
  TAB_TICK_LIMITS,
  noVariation,
  percentToCents,
  vary,
} from '../../../src/audio/variation';

const base = { freqHz: 440, levelDb: -12, filterHz: 2000 };

describe('variation', () => {
  it('is repeatable for a seed', () => {
    expect(vary(createRng(5), base)).toEqual(vary(createRng(5), base));
    expect(vary(createRng(5), base)).not.toEqual(vary(createRng(6), base));
  });

  it('stays inside the limits', () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const v = vary(rng, base);
      expect(Math.abs(v.cents)).toBeLessThanOrEqual(DEFAULT_LIMITS.pitchCents);
      expect(Math.abs(v.levelDb - base.levelDb)).toBeLessThanOrEqual(2);
      expect(Math.abs(v.filterHz / base.filterHz - 1)).toBeLessThanOrEqual(0.08 + 1e-12);
    }
  });

  it('gives the tab tick about 5%', () => {
    expect(TAB_TICK_LIMITS.pitchCents).toBeCloseTo(percentToCents(5), 9);
    expect(TAB_TICK_LIMITS.pitchCents).toBeGreaterThan(80);
  });

  it('can be switched off', () => {
    expect(noVariation(base)).toEqual({ ...base, cents: 0 });
    const zero = vary(createRng(2), base, { pitchCents: 0, levelDb: 0, filter: 0 });
    expect(zero.freqHz).toBe(440);
    expect(zero.levelDb).toBe(-12);
    expect(zero.filterHz).toBe(2000);
  });
});
