import { describe, expect, it } from 'vitest';
import { VOICE_IDS } from '../../../src/audio/schema';
import {
  VOICE_DEFAULTS,
  VOICE_KEYS,
  parseDefaults,
  settingsFor,
} from '../../../src/audio/voices/params';
import raw from '../../../src/audio/voices/defaults.json';

describe('voice params', () => {
  it('gives every voice all its keys, all finite', () => {
    for (const id of VOICE_IDS) {
      const s = VOICE_DEFAULTS[id];
      expect(Object.keys(s).sort()).toEqual([...VOICE_KEYS[id]].sort());
      for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('lets overrides win and tuning sit between', () => {
    expect(settingsFor('chord', { rise: 1 }).rise).toBe(1);
    expect(settingsFor('chord').rise).toBe(0);
    expect(settingsFor('chord', undefined, { chord: { rootHz: 100 } }).rootHz).toBe(100);
    expect(settingsFor('chord', { rootHz: 50 }, { chord: { rootHz: 100 } }).rootHz).toBe(50);
  });

  it('rejects unknown keys and unknown voices', () => {
    expect(() => settingsFor('chord', { nope: 1 })).toThrow();
    expect(() => parseDefaults({ ...raw, violin: { trimDb: 0 } })).toThrow();
    expect(() => parseDefaults({ ...raw, chord: { ...raw.chord, extra: 1 } })).toThrow();
    const without = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'tap'));
    expect(() => parseDefaults(without)).toThrow();
  });
});
