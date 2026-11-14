import { describe, expect, it } from 'vitest';
import { makeParams, parseSeed, NUM_RUNS } from '../../property/fc-config';

describe('fc-config', () => {
  it('reads a valid seed', () => {
    expect(parseSeed('1')).toBe(1);
    expect(parseSeed(' 42 ')).toBe(42);
    expect(makeParams('2')).toEqual({ numRuns: NUM_RUNS, seed: 2 });
  });
  it('ignores a missing seed', () => {
    expect(parseSeed(undefined)).toBeUndefined();
    expect(makeParams(undefined)).toEqual({ numRuns: NUM_RUNS });
  });
  it('ignores a seed that is not an integer', () => {
    for (const bad of ['', 'abc', '1.5', '1e3', '99999999999999999999']) {
      expect(parseSeed(bad)).toBeUndefined();
    }
  });
  it('runs at least 200 times', () => {
    expect(NUM_RUNS).toBeGreaterThanOrEqual(200);
  });
});
