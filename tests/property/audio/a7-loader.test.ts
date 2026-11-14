import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { loaderPlan } from '../../../src/audio/loader';
import { loaderHolds, ownSamplesArb, sharedArb } from './props';

describe('A7 loader plan', () => {
  it('holds only the chapter and the shared samples, and nothing when disabled', () => {
    fc.assert(
      fc.property(
        ownSamplesArb,
        sharedArb,
        fc.constantFrom('one', 'two', 'three', 'none'),
        fc.boolean(),
        (own, shared, chapter, enabled) => loaderHolds(loaderPlan, chapter, enabled, own, shared),
      ),
      fcParams,
    );
  });
});
