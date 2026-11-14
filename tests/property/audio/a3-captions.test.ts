import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { captionErrors, createCaptionMerger, isValidCaption } from '../../../src/audio/captions';
import { captionRuleAgrees, captionSequenceArb, mergerHolds } from './props';

describe('A3 captions', () => {
  it('never emits a repeat inside 400 ms and never drops a distinct caption', () => {
    fc.assert(
      fc.property(captionSequenceArb, (seq) =>
        mergerHolds((clock) => createCaptionMerger(clock), seq),
      ),
      fcParams,
    );
  });

  it('accepts exactly 1 to 6 words', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 14 }), (n) => captionRuleAgrees(isValidCaption, n)),
      fcParams,
    );
  });

  it('makes every caption built from the rules valid, and each breach invalid', () => {
    const word = fc.stringMatching(/^[a-z]{1,8}([-'][a-z]{1,4})?$/);
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 6 }), (words) => {
        const text = `[${words.join(' ')}]`;
        return captionErrors(text).length === 0 && !isValidCaption(text.toUpperCase());
      }),
      fcParams,
    );
  });
});
