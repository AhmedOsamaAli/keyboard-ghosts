import type { Level, RepairPatch } from './schema';
import type { GameState } from './state';

export interface Progress {
  released: number;
  total: number;
}

export function isSolved(level: Level, state: GameState): boolean {
  return level.ghosts.every((g) => state.ghosts[g.id]?.status === 'released');
}

/** Ids of the ghosts that still haunt, in level order. */
export function remaining(level: Level, state: GameState): string[] {
  return level.ghosts.filter((g) => state.ghosts[g.id]?.status !== 'released').map((g) => g.id);
}

export function progress(level: Level, state: GameState): Progress {
  const released = level.ghosts.filter((g) => state.ghosts[g.id]?.status === 'released').length;
  return { released, total: level.ghosts.length };
}

/**
 * The patches of every ghost's picked repair, decoys included.
 * Order: ghost order, then patch order.
 */
export function activePatches(level: Level, state: GameState): RepairPatch[] {
  const patches: RepairPatch[] = [];
  for (const ghost of level.ghosts) {
    const picked = state.ghosts[ghost.id]?.picked;
    if (picked === null || picked === undefined) continue;
    const repair = ghost.repairs.find((r) => r.id === picked);
    if (repair) patches.push(...repair.patches);
  }
  return patches;
}
