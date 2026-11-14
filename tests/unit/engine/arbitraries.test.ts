import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../src/engine/parse';
import { ERROR_CODES } from '../../../src/engine/schema';
import { LEVEL_BREAKERS, actionsArb, faultArb, levelArb } from '../../property/arbitraries';
import { fcParams } from '../../property/fc-config';

describe('arbitraries', () => {
  it('makes levels that always parse', () => {
    fc.assert(
      fc.property(levelArb(), (level) => parseLevel(structuredClone(level)).ok),
      fcParams,
    );
  });

  it('makes levels with the requested minimum of ghosts', () => {
    fc.assert(
      fc.property(levelArb({ minGhosts: 2 }), (level) => level.ghosts.length >= 2),
      fcParams,
    );
  });

  it('makes faults that give exactly their code', () => {
    fc.assert(
      fc.property(faultArb, ({ code, input }) => {
        const result = parseLevel(input);
        return (
          !result.ok && result.errors.every((e) => e.code === code) && result.errors.length > 0
        );
      }),
      fcParams,
    );
  });

  it('has a fault breaker for every error code', () => {
    expect(Object.keys(LEVEL_BREAKERS).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('makes actions of every type, valid and invalid', () => {
    const level = fc.sample(levelArb(), { numRuns: 1, seed: 1 })[0];
    if (!level) throw new Error('no level');
    const seen = new Set<string>();
    const lists = fc.sample(actionsArb(level), { numRuns: 100, seed: 1 });
    for (const list of lists) {
      for (const a of list) {
        seen.add(a.type);
        if (a.type !== 'undo' && a.type !== 'reset')
          seen.add(a.ghost === 'nobody' ? 'unknown' : 'known');
      }
    }
    expect([...seen].sort()).toEqual(['known', 'meet', 'repair', 'reset', 'undo', 'unknown']);
  });
});
