import type { Action, RejectReason } from './events';
import type { Level, RepairPatch } from './schema';
import { activePatches, isSolved } from './selectors';
import { AMBIENT_MIN, HISTORY_LIMIT, freshGhosts, type GameState, type GhostRecord } from './state';

export type ValidateResult = { ok: true } | { ok: false; reason: RejectReason };

/**
 * The small rule functions the engine is built from. Tests may replace any of them
 * with a broken one (a mutant). Production code never does.
 */
export interface Rules {
  /** Decides which actions are allowed. `step` asks it first. */
  validate(level: Level, state: GameState, action: Action): ValidateResult;
  /** Returns a new record where the ghost's pick is replaced and one attempt is counted. */
  pick(level: Level, ghosts: GhostRecord, ghostId: string, repairId: string): GhostRecord;
  /** Returns a new record where the ghost is released when its picked repair is correct. */
  release(level: Level, ghosts: GhostRecord, ghostId: string): GhostRecord;
  /** The per-ghost record that goes on the undo history. */
  snapshot(state: GameState): GhostRecord;
  /** Puts a snapshot back as the per-ghost record. */
  restore(state: GameState, snapshot: GhostRecord): GameState;
  /** The whole reset: every ghost haunting, and `snapshot` pushed so that undo works. */
  reset(level: Level, state: GameState, snapshot: GhostRecord): GameState;
  ambient(level: Level, state: GameState): number;
  /** A stable string that ignores history, attempts and the step counter. */
  canonical(state: GameState): string;
  solved(level: Level, state: GameState): boolean;
  activePatches(level: Level, state: GameState): RepairPatch[];
}

/** Adds an entry to the history and drops the oldest entries past the limit. */
export function pushHistory(history: GhostRecord[], entry: GhostRecord): GhostRecord[] {
  const next = [...history, entry];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

function cloneRecord(record: GhostRecord): GhostRecord {
  const out: GhostRecord = {};
  for (const [id, g] of Object.entries(record)) out[id] = { ...g };
  return out;
}

function validate(level: Level, state: GameState, action: Action): ValidateResult {
  if (action.type === 'undo' || action.type === 'reset') return { ok: true };
  const ghost = level.ghosts.find((g) => g.id === action.ghost);
  if (!ghost || !state.ghosts[ghost.id]) return { ok: false, reason: 'unknown-ghost' };
  if (action.type === 'meet') return { ok: true };
  if (!ghost.repairs.some((r) => r.id === action.repair)) {
    return { ok: false, reason: 'unknown-repair' };
  }
  if (state.ghosts[ghost.id]?.status === 'released') {
    return { ok: false, reason: 'already-released' };
  }
  return { ok: true };
}

function pick(_level: Level, ghosts: GhostRecord, ghostId: string, repairId: string): GhostRecord {
  const next = cloneRecord(ghosts);
  const current = next[ghostId];
  if (current) next[ghostId] = { ...current, picked: repairId, attempts: current.attempts + 1 };
  return next;
}

function release(level: Level, ghosts: GhostRecord, ghostId: string): GhostRecord {
  const next = cloneRecord(ghosts);
  const current = next[ghostId];
  const ghost = level.ghosts.find((g) => g.id === ghostId);
  const repair = ghost?.repairs.find((r) => r.id === current?.picked);
  if (current && repair?.correct) next[ghostId] = { ...current, status: 'released' };
  return next;
}

function snapshot(state: GameState): GhostRecord {
  return cloneRecord(state.ghosts);
}

function restore(state: GameState, saved: GhostRecord): GameState {
  return { ...state, ghosts: cloneRecord(saved) };
}

function reset(level: Level, state: GameState, saved: GhostRecord): GameState {
  return {
    ghosts: freshGhosts(level),
    history: pushHistory(state.history, saved),
    step: state.step + 1,
    seed: state.seed,
  };
}

function ambient(level: Level, state: GameState): number {
  const total = level.ghosts.length;
  const released = level.ghosts.filter((g) => state.ghosts[g.id]?.status === 'released').length;
  if (released >= total) return 1;
  if (released === 0) return AMBIENT_MIN;
  return Math.min(1, Math.max(AMBIENT_MIN, AMBIENT_MIN + ((1 - AMBIENT_MIN) * released) / total));
}

function canonical(state: GameState): string {
  const rows = Object.keys(state.ghosts)
    .sort()
    .map((id) => [id, state.ghosts[id]?.status, state.ghosts[id]?.picked]);
  return JSON.stringify(rows);
}

export const defaultRules: Rules = {
  validate,
  pick,
  release,
  snapshot,
  restore,
  reset,
  ambient,
  canonical,
  solved: isSolved,
  activePatches,
};
