import { describe, expect, it } from 'vitest';
import { countWords, isKebabCase, isSingleSentence } from '../../../src/engine/words';

describe('countWords', () => {
  it('counts words', () => {
    expect(countWords('I could not tell where I was.')).toBe(7);
  });
  it('ignores extra spaces and new lines', () => {
    expect(countWords('  one   two\nthree\t')).toBe(3);
  });
  it('counts an empty text as zero', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('isKebabCase', () => {
  it('accepts kebab-case', () => {
    for (const ok of ['a', 'ghost-1', 'the-porch', '2-doors']) expect(isKebabCase(ok)).toBe(true);
  });
  it('rejects the rest', () => {
    for (const bad of ['', 'Ghost', 'a_b', '-a', 'a-', 'a--b', 'a b']) {
      expect(isKebabCase(bad)).toBe(false);
    }
  });
});

describe('isSingleSentence', () => {
  it('accepts one sentence, with or without a final mark', () => {
    expect(isSingleSentence('It hides the ring.')).toBe(true);
    expect(isSingleSentence('It hides the ring')).toBe(true);
    expect(isSingleSentence('Does it help?')).toBe(true);
  });
  it('rejects empty text and two sentences', () => {
    expect(isSingleSentence('')).toBe(false);
    expect(isSingleSentence('.')).toBe(false);
    expect(isSingleSentence('It fails. It hides the ring.')).toBe(false);
  });
});
