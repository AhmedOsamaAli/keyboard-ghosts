import { describe, expect, it } from 'vitest';
import { restoreGame } from '../../../src/engine/restore';
import { HISTORY_LIMIT, createGame } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

const level = validLevel();

function played() {
  const s = createGame(level, 9);
  s.ghosts['invisible'] = { status: 'released', picked: 'show-ring', attempts: 2 };
  s.ghosts['faceless'] = { status: 'haunting', picked: 'colour-button', attempts: 1 };
  s.history = [createGame(level, 9).ghosts];
  s.step = 3;
  return s;
}

describe('restoreGame', () => {
  it('restores a played state after a JSON round trip', () => {
    const state = played();
    const restored = restoreGame(level, JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state);
  });

  it('returns a copy, not the input', () => {
    const state = played();
    const restored = restoreGame(level, state);
    expect(restored).toEqual(state);
    expect(restored).not.toBe(state);
    expect(restored?.ghosts).not.toBe(state.ghosts);
  });

  it('returns null for data of the wrong shape', () => {
    expect(restoreGame(level, null)).toBeNull();
    expect(restoreGame(level, 'saved')).toBeNull();
    expect(restoreGame(level, {})).toBeNull();
    const noSeed: Record<string, unknown> = { ...played() };
    delete noSeed['seed'];
    expect(restoreGame(level, noSeed)).toBeNull();
    expect(restoreGame(level, { ...played(), step: 'x' })).toBeNull();
    expect(restoreGame(level, { ...played(), seed: undefined })).toBeNull();
  });

  it('returns null for a wrong ghost id', () => {
    const s = played();
    s.ghosts['ghost-from-another-level'] = s.ghosts['invisible'] ?? {
      status: 'haunting',
      picked: null,
      attempts: 0,
    };
    expect(restoreGame(level, s)).toBeNull();
  });

  it('returns null for a released ghost with a decoy pick', () => {
    const s = played();
    s.ghosts['invisible'] = { status: 'released', picked: 'bold-text', attempts: 1 };
    expect(restoreGame(level, s)).toBeNull();
  });

  it('returns null for a history of 101 entries', () => {
    const s = played();
    s.history = Array.from({ length: HISTORY_LIMIT + 1 }, () => createGame(level, 9).ghosts);
    expect(restoreGame(level, s)).toBeNull();
    s.history = s.history.slice(1);
    expect(restoreGame(level, s)).not.toBeNull();
  });
});
