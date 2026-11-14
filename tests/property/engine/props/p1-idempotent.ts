import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import { actionsArb, levelArb } from '../../arbitraries';

/**
 * P1 Idempotent: choosing the same repair for a ghost twice gives the same
 * canonical state as once. A random prefix of actions comes first.
 */
export function propertyP1(engine: Engine) {
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      prefix: actionsArb(level, { maxLength: 15 }),
      ghost: fc.nat(level.ghosts.length - 1),
      repair: fc.nat(3),
    }),
  );
  return fc.property(input, ({ level, seed, prefix, ghost, repair }) => {
    let state = engine.createGame(level, seed);
    for (const action of prefix) state = engine.step(level, state, action).state;
    const g = level.ghosts[ghost];
    const r = g?.repairs[repair % (g?.repairs.length ?? 1)];
    if (!g || !r) return true;
    const action = { type: 'repair' as const, ghost: g.id, repair: r.id };
    const once = engine.step(level, state, action).state;
    const twice = engine.step(level, once, action).state;
    return engine.canonical(once) === engine.canonical(twice);
  });
}
