import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { SOUND_SETS } from '../../../src/audio/sets/index';
import { CHAPTERS } from './tables';
import { checkCoverage } from './props';

describe('A4 coverage', () => {
  it('matches the brief tables for every chapter', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CHAPTERS), (chapter) => {
        const errors = checkCoverage(SOUND_SETS).filter((e) => e.startsWith(chapter));
        return errors.length === 0;
      }),
      fcParams,
    );
    expect(checkCoverage(SOUND_SETS)).toEqual([]);
  });
});
