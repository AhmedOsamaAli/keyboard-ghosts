import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import type { Action } from '../../../../src/engine/events';
import type { Level } from '../../../../src/engine/schema';
import { levelArb } from '../../arbitraries';

function actionsFor(level: Level, ghostIndex: number) {
  const ghost = level.ghosts[ghostIndex];
  const ids = ghost?.repairs.map((r) => r.id) ?? [];
  return fc.array(
    fc.oneof(
      fc
        .constantFrom(...ids)
        .map((repair): Action => ({ type: 'repair', ghost: ghost?.id ?? '', repair })),
      fc.constant<Action>({ type: 'meet', ghost: ghost?.id ?? '' }),
    ),
    { minLength: 1, maxLength: 5 },
  );
}

/**
 * P2 Commutes across ghosts: actions that target different ghosts can be
 * reordered without changing the final canonical state.
 * Checks A then B, B then A, and an interleaving.
 */
export function propertyP2(engine: Engine) {
  const input = levelArb({ minGhosts: 2 }).chain((level) =>
    fc
      .record({
        level: fc.constant(level),
        seed: fc.nat(),
        first: fc.nat(level.ghosts.length - 1),
        gap: fc.integer({ min: 1, max: level.ghosts.length - 1 }),
        mask: fc.array(fc.boolean(), { minLength: 10, maxLength: 10 }),
      })
      .chain((base) => {
        const second = (base.first + base.gap) % level.ghosts.length;
        return fc.record({
          base: fc.constant(base),
          a: actionsFor(level, base.first),
          b: actionsFor(level, second),
        });
      }),
  );
  return fc.property(input, ({ base, a, b }) => {
    const { level, seed, mask } = base;
    const play = (actions: Action[]) => {
      let state = engine.createGame(level, seed);
      for (const action of actions) state = engine.step(level, state, action).state;
      return engine.canonical(state);
    };
    const interleaved: Action[] = [];
    const ra = [...a];
    const rb = [...b];
    for (let i = 0; ra.length > 0 || rb.length > 0; i++) {
      const takeA = rb.length === 0 || (ra.length > 0 && mask[i % mask.length]);
      const next = takeA ? ra.shift() : rb.shift();
      if (next) interleaved.push(next);
    }
    const ab = play([...a, ...b]);
    return ab === play([...b, ...a]) && ab === play(interleaved);
  });
}
