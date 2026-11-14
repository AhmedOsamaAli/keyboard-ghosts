import { describe, expect, it } from 'vitest';
import { CHAPTER_IDS } from '../../../src/engine/index';
import { SOUND_SETS, getSet } from '../../../src/audio/sets/index';
import { VOICE_DEFAULTS } from '../../../src/audio/voices/params';
import { settingsFor } from '../../../src/audio/voices/params';
import { isValidCaption } from '../../../src/audio/captions';

describe('sound sets', () => {
  it('parses all seven chapters', () => {
    expect(Object.keys(SOUND_SETS).sort()).toEqual([...CHAPTER_IDS].sort());
    for (const id of CHAPTER_IDS) expect(getSet(id)).toBe(SOUND_SETS[id]);
  });

  it('names only voices that exist, with settings that exist', () => {
    for (const id of CHAPTER_IDS) {
      const set = getSet(id);
      for (const b of set.beds) {
        expect(VOICE_DEFAULTS[b.voice]).toBeDefined();
        expect(() => settingsFor(b.voice, b.params)).not.toThrow();
      }
      for (const e of set.events) {
        for (const s of e.steps) expect(() => settingsFor(s.voice, s.params)).not.toThrow();
      }
    }
  });

  it('has valid captions and no sample ids yet', () => {
    for (const id of CHAPTER_IDS) {
      const set = getSet(id);
      for (const b of set.beds) {
        expect(isValidCaption(b.caption)).toBe(true);
        expect(b.sample).toBeNull();
      }
      for (const e of set.events) {
        expect(isValidCaption(e.caption)).toBe(true);
        for (const s of e.steps) expect(s.sample).toBeNull();
      }
    }
  });
});
