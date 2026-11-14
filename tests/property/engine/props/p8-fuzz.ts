import fc from 'fast-check';
import { isDeepStrictEqual } from 'node:util';
import type { Engine } from '../../../../src/engine/engine';
import type { Action } from '../../../../src/engine/events';
import type { Level } from '../../../../src/engine/schema';
import type { GameState } from '../../../../src/engine/state';
import { actionsArb, levelArb } from '../../arbitraries';

/** Freezes a value and everything inside it. An in-place change then throws. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/** True when the action should be rejected, worked out without the engine. */
function shouldReject(level: Level, state: GameState, action: Action): boolean {
  if (action.type === 'undo' || action.type === 'reset') return false;
  const ghost = level.ghosts.find((g) => g.id === action.ghost);
  if (!ghost) return true;
  if (action.type === 'meet') return false;
  if (!ghost.repairs.some((r) => r.id === action.repair)) return true;
  return state.ghosts[ghost.id]?.status === 'released';
}

/**
 * P8 Fuzz: any sequence of valid and invalid actions never throws, and
 * checkInvariants stays empty. Invalid actions change nothing and emit rejected.
 * Inputs are deep-frozen, step is deterministic, and every state survives a
 * JSON round trip and restoreGame.
 */
export function propertyP8(engine: Engine) {
  const input = levelArb().chain((level) =>
    fc.record({
      level: fc.constant(level),
      seed: fc.nat(),
      actions: actionsArb(level, { maxLength: 60 }),
    }),
  );
  return fc.property(input, ({ level: generated, seed, actions }) => {
    const level = deepFreeze(structuredClone(generated));
    let state = deepFreeze(engine.createGame(level, seed));
    if (engine.checkInvariants(level, state).length > 0) return false;

    for (const raw of actions) {
      const action = deepFreeze(structuredClone(raw));
      const first = engine.step(level, state, action);
      const second = engine.step(level, state, action);
      if (!isDeepStrictEqual(first, second)) return false;

      const rejected = shouldReject(level, state, action);
      const isRejected = first.events.length === 1 && first.events[0]?.kind === 'rejected';
      if (rejected !== isRejected) return false;
      if (rejected && !isDeepStrictEqual(first.state, state)) return false;
      if (!rejected && first.events.some((e) => e.kind === 'rejected')) return false;

      state = deepFreeze(first.state);
      if (engine.checkInvariants(level, state).length > 0) return false;

      const copy: unknown = JSON.parse(JSON.stringify(state));
      if (!isDeepStrictEqual(copy, state)) return false;
      if (!isDeepStrictEqual(engine.restoreGame(level, copy), state)) return false;
    }
    return true;
  });
}
