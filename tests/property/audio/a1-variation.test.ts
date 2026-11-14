import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { vary } from '../../../src/audio/variation';
import { baseArb, seedArb, variationHolds } from './props';

describe('A1 variation', () => {
  it('stays inside 50 cents, 2 dB and 8%, and repeats for a seed', () => {
    fc.assert(
      fc.property(seedArb, baseArb, (seed, base) =>
        variationHolds((rng, b) => vary(rng, b), seed, base),
      ),
      fcParams,
    );
  });
});
