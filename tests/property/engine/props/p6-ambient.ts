import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import { AMBIENT_MIN } from '../../../../src/engine/state';
import { actionsArb, levelArb } from '../../arbitraries';

/**
 * P6 Ambient is bounded and monotone: always within [AMBIENT_MIN, 1], equal to
 * AMBIENT_MIN when nothing is released and to 1 when everything is, and never
 * lower after one more ghost is released (without undo).
 */
export function propertyP6(engine: Engine) {
  const random = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      actions: actionsArb(level, { maxLength: 40 }),
    }),
  );
  const walk = fc.record({
    level: levelArb({ minGhosts: 3 }),
    seed: fc.nat(),
  });
  return fc.property(random, walk, ({ level, seed, actions }, w) => {
    // 1. Bounded after every action, with no release or undo ever below the minimum.
    let state = engine.createGame(level, seed);
    if (engine.ambient(level, state) !== AMBIENT_MIN) return false;
    let last = engine.ambient(level, state);
    for (const action of actions) {
      state = engine.step(level, state, action).state;
      const a = engine.ambient(level, state);
      if (!(a >= AMBIENT_MIN && a <= 1)) return false;
      // 2. Only repairs and meets: a release can never lower the light.
      if (action.type === 'repair' || action.type === 'meet') {
        // A repair on a haunting ghost can pick a decoy: ambient stays the same or rises.
        if (a < last) return false;
      }
      last = a;
    }

    // 3. Release ghosts one by one: both ends and a never-decreasing walk.
    let s = engine.createGame(w.level, w.seed);
    let previous = engine.ambient(w.level, s);
    if (previous !== AMBIENT_MIN) return false;
    for (const ghost of w.level.ghosts) {
      const correct = ghost.repairs.find((r) => r.correct);
      if (!correct) return false;
      s = engine.step(w.level, s, { type: 'repair', ghost: ghost.id, repair: correct.id }).state;
      const a = engine.ambient(w.level, s);
      if (a < previous || a < AMBIENT_MIN || a > 1) return false;
      previous = a;
    }
    return engine.isSolved(w.level, s) && engine.ambient(w.level, s) === 1;
  });
}
