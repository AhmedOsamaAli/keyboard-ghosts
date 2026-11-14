import fc from 'fast-check';
import type { Action } from '../../src/engine/events';
import {
  BARRIER_KINDS,
  CHAPTER_IDS,
  ERROR_CODES,
  type ErrorCode,
  type Ghost,
  type Level,
  type Repair,
  type RepairPatch,
} from '../../src/engine/schema';
import { WCAG_TABLE } from '../../src/engine/wcag';

const WORDS = [
  'ring',
  'light',
  'door',
  'lamp',
  'name',
  'label',
  'room',
  'path',
  'key',
  'hall',
  'pause',
  'close',
  'order',
  'skip',
];
const SELECTORS = ['#nav a', '.menu', 'button', '#main', '[role=dialog]', 'form input'];

const wordsArb = (min: number, max: number): fc.Arbitrary<string> =>
  fc.array(fc.constantFrom(...WORDS), { minLength: min, maxLength: max }).map((w) => w.join(' '));

const sentenceArb = (maxWords: number): fc.Arbitrary<string> =>
  wordsArb(1, maxWords).map((s) => `${s}.`);

const patchArb: fc.Arbitrary<RepairPatch> = fc.oneof(
  wordsArb(1, 3).map((css) => ({ op: 'css' as const, css: `a { x: ${css}; }` })),
  fc.record({
    op: fc.constant('attr' as const),
    selector: fc.constantFrom(...SELECTORS),
    name: fc.constantFrom('aria-label', 'title', 'tabindex'),
    value: fc.option(wordsArb(1, 2), { nil: null }),
  }),
  fc.record({
    op: fc.constant('text' as const),
    selector: fc.constantFrom(...SELECTORS),
    text: wordsArb(1, 3),
  }),
  fc.record({ op: fc.constant('behavior' as const), name: wordsArb(1, 1) }),
);

/** At least one of axe, levelCheck, walk is true. */
const seenByArb = fc.constantFrom(
  { axe: true, levelCheck: false, walk: false },
  { axe: false, levelCheck: true, walk: false },
  { axe: false, levelCheck: false, walk: true },
  { axe: true, levelCheck: true, walk: false },
  { axe: true, levelCheck: false, walk: true },
  { axe: false, levelCheck: true, walk: true },
  { axe: true, levelCheck: true, walk: true },
);

const repairsArb: fc.Arbitrary<Repair[]> = fc
  .record({
    count: fc.integer({ min: 2, max: 4 }),
    correctAt: fc.nat(3),
  })
  .chain(({ count, correctAt }) =>
    fc
      .array(
        fc.record({
          patches: fc.array(patchArb, { minLength: 1, maxLength: 3 }),
          why: sentenceArb(20),
        }),
        { minLength: count, maxLength: count },
      )
      .map((rows) =>
        rows.map((row, i): Repair => {
          const correct = i === correctAt % count;
          return correct
            ? { id: `repair-${i}`, label: `Fix part ${i}`, patches: row.patches, correct }
            : {
                id: `repair-${i}`,
                label: `Try part ${i}`,
                patches: row.patches,
                correct,
                why: row.why,
              };
        }),
      ),
  );

const ghostBodyArb = fc.record({
  name: wordsArb(1, 2),
  line: wordsArb(1, 14),
  barrier: fc.constantFrom(...BARRIER_KINDS),
  wcag: fc.array(fc.constantFrom(...WCAG_TABLE), { minLength: 1, maxLength: 2 }),
  selector: fc.constantFrom(...SELECTORS),
  lesson: wordsArb(1, 40),
  releaseLine: wordsArb(1, 14),
  seenBy: seenByArb,
  repairs: repairsArb,
});

export interface LevelOptions {
  minGhosts?: number;
}

/** Valid levels: every one passes `parseLevel`. */
export function levelArb(options: LevelOptions = {}): fc.Arbitrary<Level> {
  const min = options.minGhosts ?? 1;
  return fc
    .record({
      chapter: fc.constantFrom(...CHAPTER_IDS),
      title: wordsArb(1, 3),
      exitSelector: fc.constantFrom(...SELECTORS),
      hiddenNote: fc.option(wordsArb(1, 6), { nil: undefined }),
      ghosts: fc.array(ghostBodyArb, { minLength: min, maxLength: 8 }),
    })
    .map(({ chapter, title, exitSelector, hiddenNote, ghosts }): Level => {
      const level: Level = {
        id: `level-${chapter}`,
        chapter,
        title,
        look: chapter,
        page: `levels/${chapter}/index.html`,
        exit: { selector: exitSelector },
        ghosts: ghosts.map((g, i): Ghost => ({
          id: `ghost-${i}`,
          name: g.name,
          line: g.line,
          barrier: g.barrier,
          wcag: g.wcag.map((w) => ({ sc: w.sc, name: w.name, level: w.level })),
          selector: g.selector,
          lesson: g.lesson,
          releaseLine: g.releaseLine,
          seenBy: g.seenBy,
          repairs: g.repairs,
        })),
      };
      if (hiddenNote !== undefined) level.hiddenNote = hiddenNote;
      return level;
    });
}

/** Valid and invalid actions for a level. */
export function actionsArb(
  level: Level,
  options: { maxLength?: number } = {},
): fc.Arbitrary<Action[]> {
  const ghostIds = level.ghosts.map((g) => g.id);
  const ghost = fc.constantFrom(...ghostIds);
  const validRepair: fc.Arbitrary<Action> = ghost.chain((g) => {
    const found = level.ghosts.find((x) => x.id === g);
    const ids = (found?.repairs ?? []).map((r) => r.id);
    return fc.constantFrom(...ids).map((repair): Action => ({ type: 'repair', ghost: g, repair }));
  });
  const action: fc.Arbitrary<Action> = fc.oneof(
    { weight: 6, arbitrary: validRepair },
    { weight: 2, arbitrary: ghost.map((g): Action => ({ type: 'meet', ghost: g })) },
    { weight: 2, arbitrary: fc.constant<Action>({ type: 'undo' }) },
    { weight: 1, arbitrary: fc.constant<Action>({ type: 'reset' }) },
    { weight: 1, arbitrary: fc.constant<Action>({ type: 'meet', ghost: 'nobody' }) },
    {
      weight: 1,
      arbitrary: fc.constant<Action>({ type: 'repair', ghost: 'nobody', repair: 'repair-0' }),
    },
    {
      weight: 1,
      arbitrary: ghost.map((g): Action => ({ type: 'repair', ghost: g, repair: 'no-such-repair' })),
    },
  );
  return fc.array(action, { maxLength: options.maxLength ?? 40 });
}

type Breaker = (level: Level, ghostIndex: number) => void;

function ghostOf(level: Level, i: number): Ghost {
  const ghost = level.ghosts[i % level.ghosts.length];
  if (!ghost) throw new Error('level has no ghost');
  return ghost;
}

function correctOf(ghost: Ghost): Repair {
  const r = ghost.repairs.find((x) => x.correct);
  if (!r) throw new Error('ghost has no correct repair');
  return r;
}

function decoyOf(ghost: Ghost): Repair {
  const r = ghost.repairs.find((x) => !x.correct);
  if (!r) throw new Error('ghost has no decoy');
  return r;
}

/** One way to break exactly one rule per error code. Needs a level with 2 or more ghosts. */
export const LEVEL_BREAKERS: Record<ErrorCode, Breaker> = {
  'level-id-invalid': (l) => {
    l.id = 'Bad Id';
  },
  'ghost-count': (l) => {
    l.ghosts = [];
  },
  'ghost-id-duplicate': (l, i) => {
    const a = i % l.ghosts.length;
    const b = (a + 1) % l.ghosts.length;
    ghostOf(l, b).id = ghostOf(l, a).id;
  },
  'repair-count': (l, i) => {
    const g = ghostOf(l, i);
    g.repairs = [correctOf(g)];
  },
  'no-correct-repair': (l, i) => {
    const r = correctOf(ghostOf(l, i));
    r.correct = false;
    r.why = 'It does not help.';
  },
  'multiple-correct-repairs': (l, i) => {
    const r = decoyOf(ghostOf(l, i));
    r.correct = true;
    delete r.why;
  },
  'decoy-without-reason': (l, i) => {
    delete decoyOf(ghostOf(l, i)).why;
  },
  'correct-with-reason': (l, i) => {
    correctOf(ghostOf(l, i)).why = 'It works.';
  },
  'line-too-long': (l, i) => {
    ghostOf(l, i).line = Array(15).fill('word').join(' ');
  },
  'wcag-unknown': (l, i) => {
    const w = ghostOf(l, i).wcag[0];
    if (w) w.sc = '9.9.9';
  },
  'selector-empty': (l, i) => {
    ghostOf(l, i).selector = '';
  },
  'layers-none': (l, i) => {
    ghostOf(l, i).seenBy = { axe: false, levelCheck: false, walk: false };
  },
  'exit-selector-missing': (l) => {
    l.exit.selector = '';
  },
  'patch-invalid': (l, i) => {
    correctOf(ghostOf(l, i)).patches = [{ op: 'css', css: '' }];
  },
  'schema-invalid': (l) => {
    Object.assign(l, { chapter: 'cellar' });
  },
};

export interface Fault {
  code: ErrorCode;
  /** A valid level with exactly one rule broken. It is not valid, so its type is unknown. */
  input: unknown;
}

/** A valid level with exactly one broken rule, for every error code. */
export const faultArb: fc.Arbitrary<Fault> = fc
  .record({
    level: levelArb({ minGhosts: 2 }),
    code: fc.constantFrom(...ERROR_CODES),
    ghostIndex: fc.nat(7),
  })
  .map(({ level, code, ghostIndex }) => {
    const copy = structuredClone(level);
    LEVEL_BREAKERS[code](copy, ghostIndex);
    return { code, input: copy };
  });
