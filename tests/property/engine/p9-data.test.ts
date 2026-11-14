import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../src/engine/parse';
import { ERROR_CODES } from '../../../src/engine/schema';
import { LEVEL_BREAKERS, faultArb, levelArb } from '../arbitraries';
import { fcParams } from '../fc-config';

describe('P9 Data', () => {
  it('every generated valid level parses and round-trips through JSON', () => {
    fc.assert(
      fc.property(levelArb(), (level) => {
        const first = parseLevel(structuredClone(level));
        if (!first.ok) return false;
        const json: unknown = JSON.parse(JSON.stringify(first.level));
        const second = parseLevel(json);
        return second.ok && JSON.stringify(second.level) === JSON.stringify(first.level);
      }),
      fcParams,
    );
  });

  it('breaking one rule gives exactly its code, for any code', () => {
    fc.assert(
      fc.property(faultArb, ({ code, input }) => {
        const result = parseLevel(input);
        if (result.ok) return false;
        const codes = new Set(result.errors.map((e) => e.code));
        return codes.size === 1 && codes.has(code);
      }),
      fcParams,
    );
  });

  it('has a way to break every one of the 15 codes', () => {
    expect(Object.keys(LEVEL_BREAKERS).sort()).toEqual([...ERROR_CODES].sort());
  });

  it.each(ERROR_CODES)('breaking only %s gives exactly %s', (code) => {
    fc.assert(
      fc.property(levelArb({ minGhosts: 2 }), fc.nat(7), (level, ghostIndex) => {
        const copy = structuredClone(level);
        LEVEL_BREAKERS[code](copy, ghostIndex);
        const result = parseLevel(copy);
        if (result.ok) return false;
        const codes = new Set(result.errors.map((e) => e.code));
        return codes.size === 1 && codes.has(code);
      }),
      fcParams,
    );
  });
});
