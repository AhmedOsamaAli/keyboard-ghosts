import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import type { EngineEvent } from '../../../../src/engine/events';
import { levelArb } from '../../arbitraries';

/**
 * P4 Sufficient: applying every ghost's correct repair, in any order and with
 * decoys tried first, solves the level.
 */
export function propertyP4(engine: Engine) {
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      order: fc.shuffledSubarray(
        level.ghosts.map((_, i) => i),
        {
          minLength: level.ghosts.length,
          maxLength: level.ghosts.length,
        },
      ),
      decoyMasks: fc.array(fc.nat(15), { minLength: 8, maxLength: 8 }),
    }),
  );
  return fc.property(input, ({ level, seed, order, decoyMasks }) => {
    let state = engine.createGame(level, seed);
    const events: EngineEvent[] = [];
    for (const index of order) {
      const ghost = level.ghosts[index];
      if (!ghost) return false;
      const decoys = ghost.repairs.filter((r) => !r.correct);
      const correct = ghost.repairs.find((r) => r.correct);
      if (!correct) return false;
      const mask = decoyMasks[index] ?? 0;
      const tried = decoys.filter((_, j) => (mask >> j) & 1);
      for (const repair of [...tried, correct]) {
        const r = engine.step(level, state, { type: 'repair', ghost: ghost.id, repair: repair.id });
        state = r.state;
        events.push(...r.events);
      }
    }
    return (
      engine.isSolved(level, state) &&
      events.filter((e) => e.kind === 'level-solved').length === 1 &&
      engine.remaining(level, state).length === 0
    );
  });
}
