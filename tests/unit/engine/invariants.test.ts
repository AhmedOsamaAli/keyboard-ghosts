import { describe, expect, it } from 'vitest';
import { checkInvariants } from '../../../src/engine/invariants';
import { HISTORY_LIMIT, createGame, type GameState } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

const level = validLevel();

function codes(state: GameState): string[] {
  return checkInvariants(level, state).map((v) => v.code);
}

describe('checkInvariants', () => {
  it('gives an empty list for a sound state', () => {
    expect(checkInvariants(level, createGame(level, 5))).toEqual([]);
    const played = createGame(level, 5);
    played.ghosts['invisible'] = { status: 'released', picked: 'show-ring', attempts: 2 };
    played.ghosts['faceless'] = { status: 'haunting', picked: 'colour-button', attempts: 1 };
    played.history = [createGame(level, 5).ghosts];
    played.step = 3;
    expect(checkInvariants(level, played)).toEqual([]);
  });

  it('finds ghosts that differ from the level', () => {
    const s = createGame(level, 1);
    delete s.ghosts['hallway'];
    expect(codes(s)).toContain('ghost-ids-differ');
    const t = createGame(level, 1);
    t.ghosts['extra'] = { status: 'haunting', picked: null, attempts: 0 };
    expect(codes(t)).toContain('ghost-ids-differ');
  });

  it('finds a released ghost without the correct pick', () => {
    const s = createGame(level, 1);
    s.ghosts['invisible'] = { status: 'released', picked: 'bold-text', attempts: 1 };
    expect(codes(s)).toEqual(['released-without-correct-pick']);
    s.ghosts['invisible'] = { status: 'released', picked: null, attempts: 1 };
    expect(codes(s)).toEqual(['released-without-correct-pick']);
  });

  it('finds a haunting ghost with the correct pick', () => {
    const s = createGame(level, 1);
    s.ghosts['invisible'] = { status: 'haunting', picked: 'show-ring', attempts: 1 };
    expect(codes(s)).toEqual(['haunting-with-correct-pick']);
  });

  it('finds a pick that is not a repair of the ghost', () => {
    const s = createGame(level, 1);
    s.ghosts['invisible'] = { status: 'haunting', picked: 'add-name', attempts: 1 };
    expect(codes(s)).toEqual(['picked-unknown-repair']);
  });

  it('finds bad attempts', () => {
    for (const attempts of [-1, 1.5, Number.NaN]) {
      const s = createGame(level, 1);
      s.ghosts['invisible'] = { status: 'haunting', picked: null, attempts };
      expect(codes(s)).toEqual(['attempts-invalid']);
    }
  });

  it('finds a history that is too long', () => {
    const s = createGame(level, 1);
    s.history = Array.from({ length: HISTORY_LIMIT + 1 }, () => createGame(level, 1).ghosts);
    expect(codes(s)).toEqual(['history-too-long']);
  });

  it('finds a history entry that does not match the level', () => {
    const s = createGame(level, 1);
    s.history = [{}];
    expect(codes(s)).toEqual(['history-entry-invalid']);
    const t = createGame(level, 1);
    const entry = createGame(level, 1).ghosts;
    entry['invisible'] = { status: 'haunting', picked: 'add-name', attempts: 0 };
    t.history = [entry];
    expect(codes(t)).toEqual(['history-entry-invalid']);
  });

  it('finds a bad step counter and a bad seed', () => {
    const s = createGame(level, 1);
    s.step = -1;
    expect(codes(s)).toEqual(['step-invalid']);
    const t = createGame(level, 1);
    t.seed = 2 ** 32;
    expect(codes(t)).toEqual(['seed-invalid']);
    t.seed = 1.5;
    expect(codes(t)).toEqual(['seed-invalid']);
  });
});
