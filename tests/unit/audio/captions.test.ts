import { describe, expect, it } from 'vitest';
import { captionErrors, createCaptionMerger, isValidCaption } from '../../../src/audio/captions';

describe('caption rules', () => {
  it('accepts good captions', () => {
    for (const t of [
      '[a heavy door thuds]',
      "[the ghost's breath thins]",
      '[a music-box note rings]',
    ]) {
      expect(captionErrors(t)).toEqual([]);
    }
  });

  it('fails each rule alone', () => {
    expect(isValidCaption('a door creaks')).toBe(false);
    expect(isValidCaption('[a door creaks')).toBe(false);
    expect(isValidCaption('[A door creaks]')).toBe(false);
    expect(isValidCaption('[]')).toBe(false);
    expect(isValidCaption('[one two three four five six seven]')).toBe(false);
    expect(isValidCaption('[a door creaks 2 times]')).toBe(false);
    expect(isValidCaption('[a door creaks!]')).toBe(false);
    expect(isValidCaption('[one two three four five six]')).toBe(true);
  });
});

describe('caption merger', () => {
  const ev = (text: string) => ({ id: 'x', text, quiet: false });

  it('merges the same text inside 400 ms and not at 400 ms', () => {
    let now = 0;
    const m = createCaptionMerger(() => now);
    expect(m.offer(ev('[a]'))).not.toBeNull();
    now = 399;
    expect(m.offer(ev('[a]'))).toBeNull();
    now = 400;
    expect(m.offer(ev('[a]'))).not.toBeNull();
  });

  it('never drops a different text', () => {
    const m = createCaptionMerger(() => 0);
    expect(m.offer(ev('[a]'))).not.toBeNull();
    expect(m.offer(ev('[b]'))).not.toBeNull();
  });
});
