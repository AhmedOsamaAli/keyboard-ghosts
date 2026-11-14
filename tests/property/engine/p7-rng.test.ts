import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/rng';
import { fcParams } from '../fc-config';

const seedArb = fc.integer({ min: 0, max: 0xffffffff });

function draws(seed: number, n: number): number[] {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
}

describe('P7 Seeded randomness', () => {
  it('the same seed gives the same sequence', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const a = createRng(seed);
        const b = createRng(seed);
        for (let i = 0; i < 20; i++) {
          if (a.next() !== b.next()) return false;
          if (a.int(-5, 5) !== b.int(-5, 5)) return false;
        }
        return true;
      }),
      fcParams,
    );
  });

  it('keeps next in [0, 1) and int inside its bounds', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: -50, max: 50 }), fc.nat(50), (seed, min, span) => {
        const r = createRng(seed);
        for (let i = 0; i < 20; i++) {
          const x = r.next();
          const n = r.int(min, min + span);
          if (!(x >= 0 && x < 1)) return false;
          if (!(n >= min && n <= min + span)) return false;
        }
        return true;
      }),
      fcParams,
    );
  });

  it('forks with different labels are independent', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.nat(20),
        (seed, labelA, labelB, burn) => {
          fc.pre(labelA !== labelB);
          const parent = createRng(seed);
          const before = parent.state();
          const b1 = parent.fork(labelB);
          const first = Array.from({ length: 8 }, () => b1.next());
          // Using fork A, and the parent, must not change what fork B gives.
          const a = parent.fork(labelA);
          for (let i = 0; i < burn; i++) a.next();
          if (parent.state() !== before) return false;
          const b2 = parent.fork(labelB);
          const second = Array.from({ length: 8 }, () => b2.next());
          if (first.join() !== second.join()) return false;
          // Different labels give different sequences.
          const fa = parent.fork(labelA);
          return Array.from({ length: 8 }, () => fa.next()).join() !== first.join();
        },
      ),
      fcParams,
    );
  });

  it('shuffle returns a permutation and does not change its input', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { maxLength: 30 }), (seed, items) => {
        const copy = [...items];
        const out = createRng(seed).shuffle(items);
        expect(items).toEqual(copy);
        expect(out).toHaveLength(items.length);
        expect([...out].sort((x, y) => x - y)).toEqual([...items].sort((x, y) => x - y));
        return true;
      }),
      fcParams,
    );
  });

  it('pick returns a member', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { minLength: 1, maxLength: 30 }), (seed, items) =>
        items.includes(createRng(seed).pick(items)),
      ),
      fcParams,
    );
  });

  it('saved state continues the same sequence', () => {
    fc.assert(
      fc.property(seedArb, fc.nat(30), (seed, skip) => {
        const a = createRng(seed);
        for (let i = 0; i < skip; i++) a.next();
        const b = createRng(a.state());
        return draws(a.state(), 5).join() === Array.from({ length: 5 }, () => b.next()).join();
      }),
      fcParams,
    );
  });
});
