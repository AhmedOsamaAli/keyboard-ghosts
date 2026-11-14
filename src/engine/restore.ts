import { checkInvariants } from './invariants';
import type { Level } from './schema';
import { gameStateSchema, type GameState } from './state';

/**
 * Turns saved data (for example parsed from JSON) back into a game state.
 * Returns a fresh copy, or null when the shape or the invariants are wrong.
 */
export function restoreGame(level: Level, saved: unknown): GameState | null {
  const parsed = gameStateSchema.safeParse(saved);
  if (!parsed.success) return null;
  const state = parsed.data;
  return checkInvariants(level, state).length === 0 ? state : null;
}
