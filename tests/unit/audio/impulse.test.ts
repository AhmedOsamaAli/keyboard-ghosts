import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/index';
import { ROOM_SECONDS, generateImpulse } from '../../../src/audio/impulse';
import { allFinite, rt60 } from '../../../src/audio/analysis';

const SR = 22050;

describe('room impulse', () => {
  it('has the room seconds from the brief', () => {
    expect(ROOM_SECONDS).toEqual({
      porch: 0.5,
      foyer: 0.9,
      chapel: 3.2,
      gallery: 1.6,
      library: 0.7,
      attic: 1.2,
      finale: 2.0,
    });
  });

  for (const [chapter, seconds] of Object.entries(ROOM_SECONDS)) {
    it(`decays in about ${seconds} s for ${chapter}`, () => {
      const x = generateImpulse(seconds, SR, createRng(7));
      expect(allFinite(x)).toBe(true);
      expect(x.length).toBeGreaterThan(seconds * SR);
      const t = rt60(x, SR);
      expect(t).toBeGreaterThan(seconds * 0.75);
      expect(t).toBeLessThan(seconds * 1.25);
    });
  }

  it('is repeatable for a seed', () => {
    expect(generateImpulse(0.5, SR, createRng(1))).toEqual(generateImpulse(0.5, SR, createRng(1)));
    expect(generateImpulse(0.5, SR, createRng(1))).not.toEqual(
      generateImpulse(0.5, SR, createRng(2)),
    );
  });
});
