import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { focusFrequency } from '../../../src/audio/focus-curve';
import { focusCurveHolds } from './props';

describe('A6 focus curve', () => {
  const hz = fc.oneof(fc.constantFrom(350, 9000), fc.double({ min: 350, max: 9000, noNaN: true }));
  it('is monotone, exact at the ends and inside 350 to 9,000 Hz', () => {
    fc.assert(
      fc.property(
        hz,
        hz,
        fc.double({ min: 0.01, max: 2, noNaN: true }),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { maxLength: 20 }),
        (from, to, duration, fractions) =>
          focusCurveHolds(focusFrequency, from, to, duration, fractions),
      ),
      fcParams,
    );
  });
});
