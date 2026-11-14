import { describe, expect, it } from 'vitest';
import { defaultRules as rules, pushHistory } from '../../../src/engine/rules';
import { AMBIENT_MIN, HISTORY_LIMIT, createGame } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

const level = validLevel();
const fresh = () => createGame(level, 1);

describe('validate', () => {
  it('passes a good action', () => {
    expect(
      rules.validate(level, fresh(), { type: 'repair', ghost: 'invisible', repair: 'show-ring' }),
    ).toEqual({
      ok: true,
    });
    expect(rules.validate(level, fresh(), { type: 'meet', ghost: 'hallway' })).toEqual({
      ok: true,
    });
    expect(rules.validate(level, fresh(), { type: 'undo' })).toEqual({ ok: true });
    expect(rules.validate(level, fresh(), { type: 'reset' })).toEqual({ ok: true });
  });
  it('gives each reject reason', () => {
    expect(rules.validate(level, fresh(), { type: 'meet', ghost: 'nobody' })).toEqual({
      ok: false,
      reason: 'unknown-ghost',
    });
    expect(
      rules.validate(level, fresh(), { type: 'repair', ghost: 'nobody', repair: 'x' }),
    ).toEqual({
      ok: false,
      reason: 'unknown-ghost',
    });
    expect(
      rules.validate(level, fresh(), { type: 'repair', ghost: 'invisible', repair: 'x' }),
    ).toEqual({
      ok: false,
      reason: 'unknown-repair',
    });
    const released = fresh();
    released.ghosts['invisible'] = { status: 'released', picked: 'show-ring', attempts: 1 };
    expect(
      rules.validate(level, released, { type: 'repair', ghost: 'invisible', repair: 'show-ring' }),
    ).toEqual({ ok: false, reason: 'already-released' });
    expect(rules.validate(level, released, { type: 'meet', ghost: 'invisible' })).toEqual({
      ok: true,
    });
  });
});

describe('pick and release', () => {
  it('replaces a pick and counts an attempt, without changing its input', () => {
    const state = fresh();
    const one = rules.pick(level, state.ghosts, 'invisible', 'bold-text');
    const two = rules.pick(level, one, 'invisible', 'bigger-text');
    expect(state.ghosts['invisible']).toEqual({ status: 'haunting', picked: null, attempts: 0 });
    expect(one['invisible']).toEqual({ status: 'haunting', picked: 'bold-text', attempts: 1 });
    expect(two['invisible']).toEqual({ status: 'haunting', picked: 'bigger-text', attempts: 2 });
  });
  it('releases on a correct repair', () => {
    const picked = rules.pick(level, fresh().ghosts, 'invisible', 'show-ring');
    expect(rules.release(level, picked, 'invisible')['invisible']?.status).toBe('released');
  });
  it('leaves the ghost haunting on a decoy', () => {
    const picked = rules.pick(level, fresh().ghosts, 'invisible', 'bold-text');
    expect(rules.release(level, picked, 'invisible')['invisible']?.status).toBe('haunting');
  });
});

describe('snapshot, restore, reset', () => {
  it('takes a copy and restores it', () => {
    const state = fresh();
    const snap = rules.snapshot(state);
    state.ghosts['invisible'] = { status: 'released', picked: 'show-ring', attempts: 1 };
    expect(snap['invisible']?.status).toBe('haunting');
    expect(rules.restore(state, snap).ghosts).toEqual(snap);
  });
  it('resets every ghost and pushes the snapshot', () => {
    const state = fresh();
    state.ghosts['invisible'] = { status: 'released', picked: 'show-ring', attempts: 2 };
    const snap = rules.snapshot(state);
    const next = rules.reset(level, state, snap);
    expect(next.ghosts).toEqual(fresh().ghosts);
    expect(next.history).toEqual([snap]);
    expect(next.step).toBe(1);
  });
  it('keeps at most the history limit and drops the oldest', () => {
    let history = [] as ReturnType<typeof rules.snapshot>[];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      history = pushHistory(history, { g: { status: 'haunting', picked: null, attempts: i } });
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]?.['g']?.attempts).toBe(5);
  });
});

describe('ambient', () => {
  it('is AMBIENT_MIN with nothing released and 1 with everything released', () => {
    const state = fresh();
    expect(rules.ambient(level, state)).toBe(AMBIENT_MIN);
    for (const g of level.ghosts)
      state.ghosts[g.id] = { status: 'released', picked: 'x', attempts: 1 };
    expect(rules.ambient(level, state)).toBe(1);
  });
  it('rises with each release', () => {
    const state = fresh();
    const values = [rules.ambient(level, state)];
    for (const g of level.ghosts) {
      state.ghosts[g.id] = { status: 'released', picked: 'x', attempts: 1 };
      values.push(rules.ambient(level, state));
    }
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1] ?? 0);
  });
});

describe('canonical', () => {
  it('ignores history, attempts and the step counter', () => {
    const a = fresh();
    const b = fresh();
    b.step = 9;
    b.history = [rules.snapshot(a)];
    b.ghosts['invisible'] = { status: 'haunting', picked: null, attempts: 5 };
    expect(rules.canonical(a)).toBe(rules.canonical(b));
  });
  it('sees status and picked', () => {
    const a = fresh();
    const b = fresh();
    b.ghosts['invisible'] = { status: 'haunting', picked: 'bold-text', attempts: 1 };
    expect(rules.canonical(a)).not.toBe(rules.canonical(b));
  });
  it('does not depend on key order', () => {
    const a = fresh();
    const b = { ...a, ghosts: Object.fromEntries(Object.entries(a.ghosts).reverse()) };
    expect(rules.canonical(a)).toBe(rules.canonical(b));
  });
});

describe('solved and activePatches', () => {
  it('knows when the level is solved', () => {
    const state = fresh();
    expect(rules.solved(level, state)).toBe(false);
    for (const g of level.ghosts)
      state.ghosts[g.id] = { status: 'released', picked: 'x', attempts: 1 };
    expect(rules.solved(level, state)).toBe(true);
  });
  it('includes a decoy pick', () => {
    const state = fresh();
    state.ghosts['invisible'] = { status: 'haunting', picked: 'bold-text', attempts: 1 };
    expect(rules.activePatches(level, state)).toEqual(level.ghosts[0]?.repairs[1]?.patches);
  });
});
