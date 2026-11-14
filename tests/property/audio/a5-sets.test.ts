import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { SOUND_SETS } from '../../../src/audio/sets/index';
import { CHAPTERS } from './tables';
import { checkSetData, lcm } from './props';

describe('A5 sound-set data', () => {
  it('has data inside its ranges for every chapter', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CHAPTERS), (chapter) =>
        checkSetData(SOUND_SETS).every((e) => !e.startsWith(chapter)),
      ),
      fcParams,
    );
    expect(checkSetData(SOUND_SETS)).toEqual([]);
  });

  it('computes the least common multiple', () => {
    expect(lcm([47, 61])).toBe(2867);
  });
});
