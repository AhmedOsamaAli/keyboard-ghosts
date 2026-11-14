import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEngine, engine, type Engine } from '../../../src/engine/engine';
import { defaultRules, type Rules } from '../../../src/engine/rules';
import type { GhostRecord } from '../../../src/engine/state';
import { AMBIENT_MIN, freshGhosts } from '../../../src/engine/state';
import { fcParams } from '../fc-config';
import { propertyP1 } from './props/p1-idempotent';
import { propertyP10 } from './props/p10-decoys';
import { propertyP11 } from './props/p11-patches';
import { propertyP2 } from './props/p2-commutes';
import { propertyP3 } from './props/p3-necessary';
import { propertyP4 } from './props/p4-sufficient';
import { propertyP5 } from './props/p5-undo';
import { propertyP6 } from './props/p6-ambient';
import { propertyP8 } from './props/p8-fuzz';

const check = {
  P1: (e: Engine) => fc.check(propertyP1(e), fcParams),
  P2: (e: Engine) => fc.check(propertyP2(e), fcParams),
  P3: (e: Engine) => fc.check(propertyP3(e), fcParams),
  P4: (e: Engine) => fc.check(propertyP4(e), fcParams),
  P5: (e: Engine) => fc.check(propertyP5(e), fcParams),
  P6: (e: Engine) => fc.check(propertyP6(e), fcParams),
  P8: (e: Engine) => fc.check(propertyP8(e), fcParams),
  P10: (e: Engine) => fc.check(propertyP10(e), fcParams),
  P11: (e: Engine) => fc.check(propertyP11(e), fcParams),
};

type PropertyName = keyof typeof check;

interface Mutant {
  name: string;
  property: PropertyName;
  overrides: () => Partial<Rules>;
}

function copy(record: GhostRecord): GhostRecord {
  const out: GhostRecord = {};
  for (const [id, g] of Object.entries(record)) out[id] = { ...g };
  return out;
}

const MUTANTS: Mutant[] = [
  {
    name: '1. a pick that toggles off when chosen twice',
    property: 'P1',
    overrides: () => ({
      pick: (level, ghosts, ghostId, repairId) => {
        const next = defaultRules.pick(level, ghosts, ghostId, repairId);
        const now = next[ghostId];
        if (ghosts[ghostId]?.picked === repairId && now) next[ghostId] = { ...now, picked: null };
        return next;
      },
    }),
  },
  {
    name: '2. a pick that depends on the ghost touched last (order)',
    property: 'P2',
    overrides: () => {
      let last: string | null = null;
      return {
        pick: (level, ghosts, ghostId, repairId) => {
          const previous = last;
          last = ghostId;
          if (previous !== null && previous !== ghostId) return copy(ghosts);
          return defaultRules.pick(level, ghosts, ghostId, repairId);
        },
      };
    },
  },
  {
    name: '3. a necessary ghost that does not count (the last one)',
    property: 'P3',
    overrides: () => ({
      solved: (level, state) =>
        level.ghosts.slice(0, -1).every((g) => state.ghosts[g.id]?.status === 'released'),
    }),
  },
  {
    name: '4. a release that never releases the last ghost',
    property: 'P4',
    overrides: () => ({
      release: (level, ghosts, ghostId) =>
        level.ghosts[level.ghosts.length - 1]?.id === ghostId
          ? copy(ghosts)
          : defaultRules.release(level, ghosts, ghostId),
    }),
  },
  {
    name: '5. a snapshot that forgets the pick',
    property: 'P5',
    overrides: () => ({
      snapshot: (state) => {
        const out = copy(state.ghosts);
        for (const g of Object.values(out)) g.picked = null;
        return out;
      },
    }),
  },
  {
    name: '6. a reset that cannot be undone',
    property: 'P5',
    overrides: () => ({
      reset: (level, state) => ({
        ghosts: freshGhosts(level),
        history: state.history,
        step: state.step + 1,
        seed: state.seed,
      }),
    }),
  },
  {
    name: '7. an ambient that falls at the third release',
    property: 'P6',
    overrides: () => ({
      ambient: (level, state) => {
        const base = defaultRules.ambient(level, state);
        const released = level.ghosts.filter(
          (g) => state.ghosts[g.id]?.status === 'released',
        ).length;
        return released >= 3 ? AMBIENT_MIN + (base - AMBIENT_MIN) / 2 : base;
      },
    }),
  },
  {
    name: '8. an ambient that falls back to AMBIENT_MIN when the last ghost is released',
    property: 'P6',
    overrides: () => ({
      ambient: (level, state) =>
        level.ghosts.every((g) => state.ghosts[g.id]?.status === 'released')
          ? AMBIENT_MIN
          : defaultRules.ambient(level, state),
    }),
  },
  {
    name: '9. a validate that lets an unknown id through and then crashes',
    property: 'P8',
    overrides: () => ({
      validate: (level, state, action) => {
        const verdict = defaultRules.validate(level, state, action);
        return !verdict.ok && verdict.reason === 'unknown-repair' ? { ok: true } : verdict;
      },
    }),
  },
  {
    name: '10. a pick that changes the state it was given in place',
    property: 'P8',
    overrides: () => ({
      pick: (_level, ghosts, ghostId, repairId) => {
        const current = ghosts[ghostId];
        if (current) {
          current.picked = repairId;
          current.attempts += 1;
        }
        return ghosts;
      },
    }),
  },
  {
    name: '11. a decoy that releases',
    property: 'P10',
    overrides: () => ({
      release: (_level, ghosts, ghostId) => {
        const next = copy(ghosts);
        const current = next[ghostId];
        if (current && current.picked !== null) next[ghostId] = { ...current, status: 'released' };
        return next;
      },
    }),
  },
  {
    name: '12. an activePatches that ignores decoy picks',
    property: 'P11',
    overrides: () => ({
      activePatches: (level, state) =>
        level.ghosts.flatMap((ghost) => {
          const picked = state.ghosts[ghost.id]?.picked;
          const repair = ghost.repairs.find((r) => r.id === picked);
          return repair?.correct ? repair.patches : [];
        }),
    }),
  },
];

describe('mutants: each broken engine fails its property', () => {
  it('has at least 10 mutants', () => {
    expect(MUTANTS.length).toBeGreaterThanOrEqual(10);
  });

  it.each(MUTANTS)('$name fails $property', ({ property, overrides }) => {
    const mutant = createEngine(overrides());
    const broken = check[property](mutant);
    expect(broken.failed).toBe(true);
    // The real engine passes the same property.
    expect(check[property](engine).failed).toBe(false);
  });
});
