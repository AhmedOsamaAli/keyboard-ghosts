import { z } from 'zod';
import type { Level } from './schema';

/** The lowest ambient light: nothing is released. */
export const AMBIENT_MIN = 0.15;
/** The undo history keeps this many entries. */
export const HISTORY_LIMIT = 100;

export const ghostStateSchema = z.object({
  status: z.enum(['haunting', 'released']),
  picked: z.string().nullable(),
  attempts: z.number().int().min(0),
});
export type GhostState = z.infer<typeof ghostStateSchema>;

/** The per-ghost record, keyed by ghost id. */
export const ghostRecordSchema = z.record(z.string(), ghostStateSchema);
export type GhostRecord = z.infer<typeof ghostRecordSchema>;

/** Plain JSON data: it survives JSON.parse(JSON.stringify(state)) unchanged. */
export const gameStateSchema = z.object({
  ghosts: ghostRecordSchema,
  history: z.array(ghostRecordSchema),
  step: z.number().int().min(0),
  seed: z.number().int().min(0).max(0xffffffff),
});
export type GameState = z.infer<typeof gameStateSchema>;

/** A fresh record: every ghost haunting, nothing picked, no attempts. */
export function freshGhosts(level: Level): GhostRecord {
  const ghosts: GhostRecord = {};
  for (const ghost of level.ghosts) {
    ghosts[ghost.id] = { status: 'haunting', picked: null, attempts: 0 };
  }
  return ghosts;
}

export function createGame(level: Level, seed: number): GameState {
  return { ghosts: freshGhosts(level), history: [], step: 0, seed: seed >>> 0 };
}
