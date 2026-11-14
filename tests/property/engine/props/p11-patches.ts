import fc from 'fast-check';
import { isDeepStrictEqual } from 'node:util';
import type { Engine } from '../../../../src/engine/engine';
import type { Level, RepairPatch } from '../../../../src/engine/schema';
import type { GameState } from '../../../../src/engine/state';
import { actionsArb, levelArb } from '../../arbitraries';

/** The patches of every picked repair, worked out from the picks alone. */
function expectedPatches(level: Level, state: GameState): RepairPatch[] {
  const out: RepairPatch[] = [];
  for (const ghost of level.ghosts) {
    const picked = state.ghosts[ghost.id]?.picked;
    const repair = ghost.repairs.find((r) => r.id === picked);
    if (repair) out.push(...repair.patches);
  }
  return out;
}

/**
 * P11 Patches mirror the picks: after any action, activePatches holds exactly
 * the patches of every ghost's picked repair, decoys included, in ghost order
 * then patch order. After undo it equals what it was before the undone action.
 * After reset it is empty.
 */
export function propertyP11(engine: Engine) {
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      actions: actionsArb(level, { maxLength: 40 }),
    }),
  );
  return fc.property(input, ({ level, seed, actions }) => {
    let state = engine.createGame(level, seed);
    const before: RepairPatch[][] = [];
    if (engine.activePatches(level, state).length !== 0) return false;
    for (const action of actions) {
      const patchesBefore = engine.activePatches(level, state);
      const r = engine.step(level, state, action);
      const changed = (action.type === 'repair' || action.type === 'reset') && r.state !== state;
      if (changed) before.push(patchesBefore);
      const undone = r.events.some((e) => e.kind === 'undone');
      const expectedAfterUndo = undone ? before.pop() : undefined;
      state = r.state;

      const patches = engine.activePatches(level, state);
      if (!isDeepStrictEqual(patches, expectedPatches(level, state))) return false;
      if (expectedAfterUndo && !isDeepStrictEqual(patches, expectedAfterUndo)) return false;
      if (action.type === 'reset' && patches.length !== 0) return false;
    }
    return true;
  });
}
