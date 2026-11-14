import fc from 'fast-check';
import { isDeepStrictEqual } from 'node:util';
import type { Engine } from '../../../../src/engine/engine';
import type { Action } from '../../../../src/engine/events';
import { actionsArb, levelArb } from '../../arbitraries';

/**
 * P5 Undo restores: after any state-changing action (repair or reset), undo
 * returns exactly the previous canonical state. With empty history it changes
 * nothing and emits nothing-to-undo.
 */
export function propertyP5(engine: Engine) {
  const reset: Action = { type: 'reset' };
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      prefix: actionsArb(level, { maxLength: 25 }),
      last: fc.oneof(
        fc.constant(reset),
        actionsArb(level, { maxLength: 1 }).map((a) => a[0] ?? reset),
      ),
    }),
  );
  return fc.property(input, ({ level, seed, prefix, last }) => {
    const first = engine.createGame(level, seed);

    // With empty history, undo changes nothing.
    const empty = engine.step(level, first, { type: 'undo' });
    if (engine.canonical(empty.state) !== engine.canonical(first)) return false;
    if (!isDeepStrictEqual(empty.state, first)) return false;
    if (empty.events.length !== 1 || empty.events[0]?.kind !== 'nothing-to-undo') return false;

    let state = first;
    for (const action of [...prefix, last]) {
      const before = state;
      const r = engine.step(level, before, action);
      state = r.state;
      const changed = (action.type === 'repair' || action.type === 'reset') && r.state !== before;
      if (!changed) continue;
      const undone = engine.step(level, r.state, { type: 'undo' });
      if (engine.canonical(undone.state) !== engine.canonical(before)) return false;
      if (!isDeepStrictEqual(undone.state.ghosts, before.ghosts)) return false;
      if (undone.events.length !== 1 || undone.events[0]?.kind !== 'undone') return false;
    }
    return true;
  });
}
