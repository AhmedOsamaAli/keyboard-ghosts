import { describe, expect, it } from 'vitest';
import {
  FOCUS_CLOSED_HZ,
  FOCUS_CLOSE_SECONDS,
  FOCUS_OPEN_HZ,
  focusCurveSamples,
  focusFrequency,
} from '../../../src/audio/focus-curve';

describe('focus curve', () => {
  it('is exact at both ends', () => {
    expect(focusFrequency(FOCUS_OPEN_HZ, FOCUS_CLOSED_HZ, FOCUS_CLOSE_SECONDS, 0)).toBe(9000);
    expect(
      focusFrequency(FOCUS_OPEN_HZ, FOCUS_CLOSED_HZ, FOCUS_CLOSE_SECONDS, FOCUS_CLOSE_SECONDS),
    ).toBe(350);
  });

  it('goes through the geometric middle', () => {
    const mid = focusFrequency(9000, 350, 1, 0.5);
    expect(mid).toBeCloseTo(Math.sqrt(9000 * 350), 6);
  });

  it('clamps time and frequencies', () => {
    expect(focusFrequency(9000, 350, 1, -3)).toBe(9000);
    expect(focusFrequency(9000, 350, 1, 7)).toBe(350);
    expect(focusFrequency(20000, 10, 1, 0)).toBe(9000);
    expect(focusFrequency(9000, 350, 0, 0)).toBe(350);
  });

  it('gives samples that start and end exactly', () => {
    const s = focusCurveSamples(350, 9000, 64);
    expect(s).toHaveLength(64);
    expect(s[0]).toBe(350);
    expect(s[63]).toBe(9000);
  });
});
