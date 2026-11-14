import fc from 'fast-check';
import type { Engine } from '../../../../src/engine/engine';
import { actionsArb, levelArb } from '../../arbitraries';

/**
 * P10 Decoys never release: picking a decoy never releases the ghost and always
 * emits that decoy's why word for word (in the repair-chosen event).
 */
export function propertyP10(engine: Engine) {
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      prefix: actionsArb(level, { maxLength: 30 }),
    }),
  );
  return fc.property(input, ({ level, seed, prefix }) => {
    let state = engine.createGame(level, seed);
    for (const action of prefix) state = engine.step(level, state, action).state;
    for (const ghost of level.ghosts) {
      if (state.ghosts[ghost.id]?.status === 'released') continue;
      for (const decoy of ghost.repairs.filter((r) => !r.correct)) {
        const r = engine.step(level, state, { type: 'repair', ghost: ghost.id, repair: decoy.id });
        if (r.state.ghosts[ghost.id]?.status !== 'haunting') return false;
        if (r.events.length !== 1) return false;
        const e = r.events[0];
        if (e?.kind !== 'repair-chosen' || e.correct || e.why !== decoy.why) return false;
        if (e.ghost !== ghost.id || e.repair !== decoy.id) return false;
      }
    }
    return true;
  });
}
