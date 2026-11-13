import { describe, expect, it } from 'vitest';
import { clamp } from '../../src/engine/clamp';

describe('clamp', () => {
  it('returns n when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below and above', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
