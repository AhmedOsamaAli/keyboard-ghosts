import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/index';
import { brownNoise, pinkNoise, whiteNoise } from '../../../src/audio/noise';

/** Energy of the first difference over energy of the signal: high for bright noise. */
function brightness(x: Float32Array): number {
  let d = 0;
  let e = 0;
  for (let i = 1; i < x.length; i++) {
    const a = x[i] as number;
    const b = x[i - 1] as number;
    d += (a - b) ** 2;
    e += a * a;
  }
  return d / e;
}

describe('noise', () => {
  it('is repeatable for a seed and differs for another', () => {
    expect(whiteNoise(createRng(1), 100)).toEqual(whiteNoise(createRng(1), 100));
    expect(whiteNoise(createRng(1), 100)).not.toEqual(whiteNoise(createRng(2), 100));
    expect(pinkNoise(createRng(1), 100)).toEqual(pinkNoise(createRng(1), 100));
    expect(brownNoise(createRng(1), 100)).toEqual(brownNoise(createRng(1), 100));
  });

  it('stays in range and has a length', () => {
    for (const f of [whiteNoise, pinkNoise, brownNoise]) {
      const x = f(createRng(3), 5000);
      expect(x).toHaveLength(5000);
      expect(Math.max(...x)).toBeLessThanOrEqual(1);
      expect(Math.min(...x)).toBeGreaterThanOrEqual(-1);
    }
  });

  it('has more low-frequency energy from white to pink to brown', () => {
    const w = brightness(whiteNoise(createRng(4), 20000));
    const p = brightness(pinkNoise(createRng(4), 20000));
    const b = brightness(brownNoise(createRng(4), 20000));
    expect(w).toBeGreaterThan(p);
    expect(p).toBeGreaterThan(b);
  });
});
