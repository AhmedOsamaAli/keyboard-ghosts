import { describe, expect, it } from 'vitest';
import { EVENT_KINDS } from '../../../src/engine/events';
import { checkInvariants } from '../../../src/engine/invariants';
import { AMBIENT_MIN, HISTORY_LIMIT, createGame, gameStateSchema } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

describe('createGame', () => {
  it('starts every ghost haunting with nothing picked', () => {
    const state = createGame(validLevel(), 7);
    expect(Object.keys(state.ghosts)).toEqual(['invisible', 'faceless', 'hallway']);
    for (const g of Object.values(state.ghosts)) {
      expect(g).toEqual({ status: 'haunting', picked: null, attempts: 0 });
    }
    expect(state.history).toEqual([]);
    expect(state.step).toBe(0);
  });
  it('stores the seed', () => {
    expect(createGame(validLevel(), 12345).seed).toBe(12345);
  });
  it('survives a JSON round trip unchanged', () => {
    const state = createGame(validLevel(), 3);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(gameStateSchema.safeParse(state).success).toBe(true);
  });
  it('has the fixed constants', () => {
    expect(AMBIENT_MIN).toBe(0.15);
    expect(HISTORY_LIMIT).toBe(100);
  });
});

describe('EVENT_KINDS', () => {
  it('has exactly the 9 kinds', () => {
    expect([...EVENT_KINDS]).toEqual([
      'ghost-met',
      'repair-chosen',
      'focus-restored',
      'ghost-released',
      'level-solved',
      'undone',
      'level-reset',
      'nothing-to-undo',
      'rejected',
    ]);
  });
});

describe('createGame seed', () => {
  it('keeps the seed as an unsigned 32-bit number', () => {
    const level = validLevel();
    const big = createGame(level, 2 ** 32 + 5);
    const negative = createGame(level, -1);
    expect(big.seed).toBe(5);
    expect(negative.seed).toBe(4294967295);
    expect(checkInvariants(level, big)).toEqual([]);
    expect(checkInvariants(level, negative)).toEqual([]);
  });
});
