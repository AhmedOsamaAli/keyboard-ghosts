import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import type { EngineEvent } from '../../../../src/engine/events';
import { levelArb } from '../../arbitraries';

/**
 * P3 Every ghost is necessary: leaving any one ghost's correct repair out
 * leaves the level unsolved.
 */
export function propertyP3(engine: Engine) {
  return fc.property(levelArb(), fc.nat(), (level, seed) => {
    for (const skipped of level.ghosts) {
      let state = engine.createGame(level, seed);
      const events: EngineEvent[] = [];
      for (const ghost of level.ghosts) {
        if (ghost.id === skipped.id) continue;
        const correct = ghost.repairs.find((r) => r.correct);
        if (!correct) return false;
        const r = engine.step(level, state, {
          type: 'repair',
          ghost: ghost.id,
          repair: correct.id,
        });
        state = r.state;
        events.push(...r.events);
      }
      if (engine.isSolved(level, state)) return false;
      if (events.some((e) => e.kind === 'level-solved')) return false;
    }
    return true;
  });
}
