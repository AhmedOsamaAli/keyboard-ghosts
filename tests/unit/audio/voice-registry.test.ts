import { describe, expect, it } from 'vitest';
import { VOICE_IDS } from '../../../src/audio/schema';
import { VOICE_BUILDERS } from '../../../src/audio/voices/index';
import { VOICE_DEFAULTS } from '../../../src/audio/voices/params';

describe('voice registry', () => {
  it('has a builder and defaults for every voice', () => {
    expect(Object.keys(VOICE_BUILDERS).sort()).toEqual([...VOICE_IDS].sort());
    for (const id of VOICE_IDS) {
      expect(typeof VOICE_BUILDERS[id]).toBe('function');
      expect(VOICE_DEFAULTS[id]).toBeDefined();
    }
  });
});
