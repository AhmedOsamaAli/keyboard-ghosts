import type { Action, EngineEvent } from './events';
import { checkInvariants } from './invariants';
import { restoreGame } from './restore';
import { defaultRules, pushHistory, type Rules } from './rules';
import type { Level, RepairPatch } from './schema';
import { progress, remaining, type Progress } from './selectors';
import { createGame, type GameState } from './state';

export interface StepResult {
  state: GameState;
  events: EngineEvent[];
}

export interface Engine {
  createGame: typeof createGame;
  restoreGame: typeof restoreGame;
  checkInvariants: typeof checkInvariants;
  step(level: Level, state: GameState, action: Action): StepResult;
  isSolved(level: Level, state: GameState): boolean;
  remaining(level: Level, state: GameState): string[];
  progress(level: Level, state: GameState): Progress;
  activePatches(level: Level, state: GameState): RepairPatch[];
  ambient(level: Level, state: GameState): number;
  canonical(state: GameState): string;
}

/** Looks a value up and fails loudly when `validate` let a bad id through. */
function mustFind<T>(items: readonly T[], test: (item: T) => boolean, what: string): T {
  const found = items.find(test);
  if (found === undefined) throw new Error(`step: ${what} not found; validate should reject it`);
  return found;
}

/**
 * Builds the engine from rule functions. `overrides` exists only so tests can inject
 * broken rules (mutants). Production code never passes it.
 */
export function createEngine(overrides: Partial<Rules> = {}): Engine {
  const rules: Rules = { ...defaultRules, ...overrides };

  function step(level: Level, state: GameState, action: Action): StepResult {
    const verdict = rules.validate(level, state, action);
    if (!verdict.ok) {
      const event: EngineEvent = { kind: 'rejected', reason: verdict.reason };
      if (action.type === 'meet' || action.type === 'repair') event.ghost = action.ghost;
      if (action.type === 'repair') event.repair = action.repair;
      return { state, events: [event] };
    }

    switch (action.type) {
      case 'meet':
        return { state, events: [{ kind: 'ghost-met', ghost: action.ghost }] };

      case 'repair': {
        const ghost = mustFind(level.ghosts, (g) => g.id === action.ghost, 'ghost');
        const repair = mustFind(ghost.repairs, (r) => r.id === action.repair, 'repair');
        const saved = rules.snapshot(state);
        const picked = rules.pick(level, state.ghosts, ghost.id, repair.id);
        const ghosts = rules.release(level, picked, ghost.id);
        const next: GameState = {
          ...state,
          ghosts,
          history: pushHistory(state.history, saved),
          step: state.step + 1,
        };
        const chosen: EngineEvent = {
          kind: 'repair-chosen',
          ghost: ghost.id,
          repair: repair.id,
          correct: repair.correct,
        };
        if (!repair.correct && repair.why !== undefined) chosen.why = repair.why;
        const events: EngineEvent[] = [chosen];
        const wasReleased = state.ghosts[ghost.id]?.status === 'released';
        if (!wasReleased && ghosts[ghost.id]?.status === 'released') {
          events.push({ kind: 'focus-restored', ghost: ghost.id });
          events.push({ kind: 'ghost-released', ghost: ghost.id, releaseLine: ghost.releaseLine });
          if (rules.solved(level, next)) events.push({ kind: 'level-solved', level: level.id });
        }
        return { state: next, events };
      }

      case 'undo': {
        const saved = state.history[state.history.length - 1];
        if (saved === undefined) {
          return { state, events: [{ kind: 'nothing-to-undo', level: level.id }] };
        }
        const base: GameState = {
          ...state,
          history: state.history.slice(0, -1),
          step: state.step + 1,
        };
        return { state: rules.restore(base, saved), events: [{ kind: 'undone', level: level.id }] };
      }

      case 'reset':
        return {
          state: rules.reset(level, state, rules.snapshot(state)),
          events: [{ kind: 'level-reset', level: level.id }],
        };
    }
  }

  return {
    createGame,
    restoreGame,
    checkInvariants,
    step,
    isSolved: (level, state) => rules.solved(level, state),
    remaining,
    progress,
    activePatches: (level, state) => rules.activePatches(level, state),
    ambient: (level, state) => rules.ambient(level, state),
    canonical: (state) => rules.canonical(state),
  };
}

/** The real engine. */
export const engine: Engine = createEngine();
export const step = engine.step;
export const isSolved = engine.isSolved;
export const activePatches = engine.activePatches;
export const ambient = engine.ambient;
export const canonical = engine.canonical;
export { createGame, restoreGame, checkInvariants, remaining, progress };
