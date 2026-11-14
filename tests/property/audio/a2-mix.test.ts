import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { dbToGain, gainToDb, limiterModel } from '../../../src/audio/db';
import { dbRoundTrips, limiterCeilingHolds } from './props';

describe('A2 mix', () => {
  it('round trips dB and gain', () => {
    fc.assert(
      fc.property(fc.double({ min: -120, max: 24, noNaN: true }), (db) =>
        dbRoundTrips(dbToGain, gainToDb, db),
      ),
      fcParams,
    );
  });

  it('keeps the limiter model at or under the ceiling', () => {
    const peak = fc.oneof(
      fc.double({ min: 0, max: 2, noNaN: true }),
      fc.double({ min: 0, max: 1e6, noNaN: true }),
    );
    fc.assert(
      fc.property(fc.array(peak, { maxLength: 30 }), (peaks) =>
        limiterCeilingHolds(limiterModel, peaks),
      ),
      fcParams,
    );
  });
});
