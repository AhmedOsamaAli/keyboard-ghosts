import { describe, expect, it } from 'vitest';
import * as barrel from '../../../src/engine/index';

const NAMES = [
  'clamp',
  'createEngine',
  'step',
  'isSolved',
  'activePatches',
  'ambient',
  'canonical',
  'EVENT_KINDS',
  'checkInvariants',
  'parseLevel',
  'restoreGame',
  'createRng',
  'BARRIER_KINDS',
  'CHAPTER_IDS',
  'ERROR_CODES',
  'LAYER_IDS',
  'levelSchema',
  'ghostSchema',
  'repairSchema',
  'repairPatchSchema',
  'wcagSchema',
  'remaining',
  'progress',
  'AMBIENT_MIN',
  'HISTORY_LIMIT',
  'createGame',
  'gameStateSchema',
  'WCAG_TABLE',
  'findWcag',
  'understandingUrl',
];

describe('barrel', () => {
  it.each(NAMES)('exports %s', (name) => {
    expect(barrel).toHaveProperty(name);
    expect((barrel as Record<string, unknown>)[name]).toBeDefined();
  });
  it('has no default export', () => {
    expect(barrel).not.toHaveProperty('default');
  });
  it('plays a level through the barrel only', () => {
    const level = barrel.levelSchema.parse({
      id: 'tiny',
      chapter: 'porch',
      title: 'Tiny',
      look: 'porch',
      page: 'levels/porch/index.html',
      exit: { selector: '#out' },
      ghosts: [
        {
          id: 'g',
          name: 'G',
          line: 'I wait.',
          barrier: 'focus-invisible',
          wcag: [{ sc: '2.4.7', name: 'Focus Visible', level: 'AA' }],
          selector: '#a',
          lesson: 'Show the ring.',
          releaseLine: 'Free.',
          seenBy: { axe: true, levelCheck: false, walk: false },
          repairs: [
            { id: 'ok', label: 'Show it', patches: [{ op: 'behavior', name: 'x' }], correct: true },
            {
              id: 'no',
              label: 'Hide it',
              patches: [{ op: 'behavior', name: 'y' }],
              correct: false,
              why: 'It hides the ring.',
            },
          ],
        },
      ],
    });
    const parsed = barrel.parseLevel(level);
    expect(parsed.ok).toBe(true);
    const r = barrel.step(level, barrel.createGame(level, 1), {
      type: 'repair',
      ghost: 'g',
      repair: 'ok',
    });
    expect(barrel.isSolved(level, r.state)).toBe(true);
    expect(barrel.ambient(level, r.state)).toBe(1);
  });
});
