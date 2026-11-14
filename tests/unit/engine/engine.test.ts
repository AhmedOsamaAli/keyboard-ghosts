import { describe, expect, it } from 'vitest';
import { createEngine, engine, step } from '../../../src/engine/engine';
import type { Action, EngineEvent } from '../../../src/engine/events';
import { HISTORY_LIMIT, createGame, type GameState } from '../../../src/engine/state';
import { validLevel } from '../../fixtures/levels/single-faults';

const level = validLevel();
const fresh = () => createGame(level, 1);

function run(state: GameState, ...actions: Action[]): { state: GameState; events: EngineEvent[] } {
  let current = state;
  const events: EngineEvent[] = [];
  for (const action of actions) {
    const r = step(level, current, action);
    current = r.state;
    events.push(...r.events);
  }
  return { state: current, events };
}

const repair = (ghost: string, id: string): Action => ({ type: 'repair', ghost, repair: id });

describe('step: repair', () => {
  it('emits the events of a correct repair in order', () => {
    const r = step(level, fresh(), repair('invisible', 'show-ring'));
    expect(r.events).toEqual([
      { kind: 'repair-chosen', ghost: 'invisible', repair: 'show-ring', correct: true },
      { kind: 'focus-restored', ghost: 'invisible' },
      { kind: 'ghost-released', ghost: 'invisible', releaseLine: 'Now I can see where I am.' },
    ]);
    expect(r.state.ghosts['invisible']).toEqual({
      status: 'released',
      picked: 'show-ring',
      attempts: 1,
    });
  });

  it('emits level-solved after the last ghost', () => {
    const r = run(
      fresh(),
      repair('invisible', 'show-ring'),
      repair('faceless', 'add-name'),
      repair('hallway', 'add-skip-link'),
    );
    expect(r.events.filter((e) => e.kind === 'level-solved')).toEqual([
      { kind: 'level-solved', level: 'foyer-test' },
    ]);
    expect(r.events[r.events.length - 1]?.kind).toBe('level-solved');
    expect(engine.isSolved(level, r.state)).toBe(true);
  });

  it('carries correct and the decoy reason on repair-chosen', () => {
    const r = step(level, fresh(), repair('invisible', 'bold-text'));
    expect(r.events).toEqual([
      {
        kind: 'repair-chosen',
        ghost: 'invisible',
        repair: 'bold-text',
        correct: false,
        why: 'Bold text does not show where the focus is.',
      },
    ]);
    expect(r.state.ghosts['invisible']?.status).toBe('haunting');
  });

  it('replaces a pick and counts an attempt', () => {
    const r = run(fresh(), repair('invisible', 'bold-text'), repair('invisible', 'bigger-text'));
    expect(r.state.ghosts['invisible']).toEqual({
      status: 'haunting',
      picked: 'bigger-text',
      attempts: 2,
    });
    expect(r.state.step).toBe(2);
  });

  it('does not change its input', () => {
    const state = fresh();
    const copy = structuredClone(state);
    step(level, state, repair('invisible', 'show-ring'));
    expect(state).toEqual(copy);
  });
});

describe('step: rejections', () => {
  it.each([
    [{ type: 'meet', ghost: 'nobody' }, 'unknown-ghost', { ghost: 'nobody' }],
    [
      { type: 'repair', ghost: 'nobody', repair: 'x' },
      'unknown-ghost',
      { ghost: 'nobody', repair: 'x' },
    ],
    [
      { type: 'repair', ghost: 'invisible', repair: 'x' },
      'unknown-repair',
      { ghost: 'invisible', repair: 'x' },
    ],
  ] as const)('rejects %j', (action, reason, ids) => {
    const state = fresh();
    const r = step(level, state, action);
    expect(r.state).toBe(state);
    expect(r.events).toEqual([{ kind: 'rejected', reason, ...ids }]);
  });

  it('rejects a change to a released ghost, and keeps the state', () => {
    const released = step(level, fresh(), repair('invisible', 'show-ring')).state;
    const r = step(level, released, repair('invisible', 'bold-text'));
    expect(r.state).toBe(released);
    expect(r.events).toEqual([
      { kind: 'rejected', reason: 'already-released', ghost: 'invisible', repair: 'bold-text' },
    ]);
  });
});

describe('step: meet', () => {
  it('returns the same state object and keeps the step counter', () => {
    const state = run(fresh(), repair('invisible', 'bold-text')).state;
    const r = step(level, state, { type: 'meet', ghost: 'faceless' });
    expect(r.state).toBe(state);
    expect(r.state.step).toBe(1);
    expect(r.events).toEqual([{ kind: 'ghost-met', ghost: 'faceless' }]);
  });
  it('works on a released ghost', () => {
    const released = step(level, fresh(), repair('invisible', 'show-ring')).state;
    const r = step(level, released, { type: 'meet', ghost: 'invisible' });
    expect(r.state).toBe(released);
    expect(r.events).toEqual([{ kind: 'ghost-met', ghost: 'invisible' }]);
  });
});

describe('step: undo', () => {
  it('brings the previous state back and counts a step', () => {
    const before = run(fresh(), repair('invisible', 'bold-text')).state;
    const after = step(level, before, repair('invisible', 'show-ring')).state;
    const r = step(level, after, { type: 'undo' });
    expect(r.events).toEqual([{ kind: 'undone', level: 'foyer-test' }]);
    expect(r.state.ghosts).toEqual(before.ghosts);
    expect(r.state.history).toEqual(before.history);
    expect(r.state.step).toBe(after.step + 1);
  });
  it('returns the same object when the history is empty', () => {
    const state = fresh();
    const r = step(level, state, { type: 'undo' });
    expect(r.state).toBe(state);
    expect(r.events).toEqual([{ kind: 'nothing-to-undo', level: 'foyer-test' }]);
  });
  it('undoes a solved level and then lets the ghost be repaired again', () => {
    const solved = run(
      fresh(),
      repair('invisible', 'show-ring'),
      repair('faceless', 'add-name'),
      repair('hallway', 'add-skip-link'),
    ).state;
    const back = step(level, solved, { type: 'undo' }).state;
    expect(engine.isSolved(level, back)).toBe(false);
    expect(step(level, back, repair('hallway', 'add-skip-link')).events.at(-1)?.kind).toBe(
      'level-solved',
    );
  });
});

describe('step: reset', () => {
  it('puts every ghost back and emits level-reset, never undone', () => {
    const played = run(
      fresh(),
      repair('invisible', 'show-ring'),
      repair('faceless', 'colour-button'),
    ).state;
    const r = step(level, played, { type: 'reset' });
    expect(r.events).toEqual([{ kind: 'level-reset', level: 'foyer-test' }]);
    expect(r.state.ghosts).toEqual(fresh().ghosts);
    expect(engine.activePatches(level, r.state)).toEqual([]);
  });
  it('is undone by undo', () => {
    const played = run(
      fresh(),
      repair('invisible', 'show-ring'),
      repair('faceless', 'colour-button'),
    ).state;
    const reset = step(level, played, { type: 'reset' }).state;
    const back = step(level, reset, { type: 'undo' });
    expect(back.events).toEqual([{ kind: 'undone', level: 'foyer-test' }]);
    expect(back.state.ghosts).toEqual(played.ghosts);
    expect(engine.canonical(back.state)).toBe(engine.canonical(played));
  });
  it('pushes one history entry even on a fresh state', () => {
    const r = step(level, fresh(), { type: 'reset' });
    expect(r.state.history).toHaveLength(1);
    expect(r.state.step).toBe(1);
  });
});

describe('history limit', () => {
  it('keeps 100 entries and drops the oldest', () => {
    let state = fresh();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      state = step(level, state, repair('invisible', i % 2 ? 'bold-text' : 'bigger-text')).state;
    }
    expect(state.history).toHaveLength(HISTORY_LIMIT);
    expect(state.step).toBe(HISTORY_LIMIT + 20);
  });
});

describe('createEngine', () => {
  it('uses an override in place of a rule', () => {
    const custom = createEngine({ ambient: () => 0.5, canonical: () => 'x' });
    expect(custom.ambient(level, fresh())).toBe(0.5);
    expect(custom.canonical(fresh())).toBe('x');
    expect(engine.canonical(fresh())).not.toBe('x');
  });
  it('asks validate first', () => {
    const custom = createEngine({ validate: () => ({ ok: false, reason: 'already-released' }) });
    const r = custom.step(level, fresh(), repair('invisible', 'show-ring'));
    expect(r.events[0]).toMatchObject({ kind: 'rejected', reason: 'already-released' });
  });
});
