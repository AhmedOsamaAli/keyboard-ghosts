import { describe, expect, it } from 'vitest';
import { activePatches, isSolved, progress, remaining } from '../../../src/engine/selectors';
import { createGame, type GameState } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

function withPicks(picks: Record<string, [string, 'haunting' | 'released']>): GameState {
  const state = createGame(validLevel(), 1);
  for (const [id, [picked, status]] of Object.entries(picks)) {
    state.ghosts[id] = { status, picked, attempts: 1 };
  }
  return state;
}

describe('selectors', () => {
  const level = validLevel();

  it('gives an empty patch list for a fresh state', () => {
    expect(activePatches(level, createGame(level, 1))).toEqual([]);
  });

  it('lists patches in ghost order, then patch order', () => {
    const state = withPicks({
      hallway: ['add-skip-link', 'released'],
      invisible: ['show-ring', 'released'],
    });
    const patches = activePatches(level, state);
    expect(patches).toEqual([
      ...(level.ghosts[0]?.repairs[0]?.patches ?? []),
      ...(level.ghosts[2]?.repairs[0]?.patches ?? []),
    ]);
  });

  it('includes a decoy pick', () => {
    const state = withPicks({ faceless: ['colour-button', 'haunting'] });
    expect(activePatches(level, state)).toEqual(level.ghosts[1]?.repairs[2]?.patches);
  });

  it('adds nothing for a ghost with nothing picked', () => {
    const state = withPicks({ faceless: ['add-name', 'released'] });
    expect(activePatches(level, state)).toHaveLength(1);
  });

  it('ignores a picked id that the ghost does not have', () => {
    const state = withPicks({ faceless: ['nope', 'haunting'] });
    expect(activePatches(level, state)).toEqual([]);
  });

  it('reports remaining, progress and solved', () => {
    const fresh = createGame(level, 1);
    expect(remaining(level, fresh)).toEqual(['invisible', 'faceless', 'hallway']);
    expect(progress(level, fresh)).toEqual({ released: 0, total: 3 });
    expect(isSolved(level, fresh)).toBe(false);

    const some = withPicks({ faceless: ['add-name', 'released'] });
    expect(remaining(level, some)).toEqual(['invisible', 'hallway']);
    expect(progress(level, some)).toEqual({ released: 1, total: 3 });

    const all = withPicks({
      invisible: ['show-ring', 'released'],
      faceless: ['add-name', 'released'],
      hallway: ['add-skip-link', 'released'],
    });
    expect(isSolved(level, all)).toBe(true);
    expect(remaining(level, all)).toEqual([]);
  });
});
