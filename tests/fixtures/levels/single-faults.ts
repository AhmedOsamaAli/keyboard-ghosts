import { levelSchema, type ErrorCode, type Level } from '../../../src/engine/schema';
import validJson from './valid-3-ghost.json';

/** The valid 3-ghost level, read through the schema. Each call returns a fresh copy. */
export function validLevel(): Level {
  return structuredClone(levelSchema.parse(validJson));
}

type Breaker = (level: Level) => void;

function ghostAt(level: Level, i: number): Level['ghosts'][number] {
  const ghost = level.ghosts[i];
  if (!ghost) throw new Error(`fixture has no ghost ${i}`);
  return ghost;
}

function repairAt(level: Level, g: number, r: number): Level['ghosts'][number]['repairs'][number] {
  const repair = ghostAt(level, g).repairs[r];
  if (!repair) throw new Error(`fixture has no repair ${g}.${r}`);
  return repair;
}

/** One way to break exactly one rule for each error code. */
export const FAULT_BREAKERS: Record<ErrorCode, Breaker> = {
  'level-id-invalid': (l) => {
    l.id = 'Foyer Level';
  },
  'ghost-count': (l) => {
    l.ghosts = [];
  },
  'ghost-id-duplicate': (l) => {
    ghostAt(l, 1).id = ghostAt(l, 0).id;
  },
  'repair-count': (l) => {
    ghostAt(l, 0).repairs = [repairAt(l, 0, 0)];
  },
  'no-correct-repair': (l) => {
    const r = repairAt(l, 0, 0);
    r.correct = false;
    r.why = 'It does not help.';
  },
  'multiple-correct-repairs': (l) => {
    const r = repairAt(l, 0, 1);
    r.correct = true;
    delete r.why;
  },
  'decoy-without-reason': (l) => {
    delete repairAt(l, 0, 1).why;
  },
  'correct-with-reason': (l) => {
    repairAt(l, 0, 0).why = 'It works.';
  },
  'line-too-long': (l) => {
    ghostAt(l, 0).line = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
  },
  'wcag-unknown': (l) => {
    const w = ghostAt(l, 0).wcag[0];
    if (w) w.sc = '9.9.9';
  },
  'selector-empty': (l) => {
    ghostAt(l, 0).selector = '';
  },
  'layers-none': (l) => {
    ghostAt(l, 0).seenBy = { axe: false, levelCheck: false, walk: false };
  },
  'exit-selector-missing': (l) => {
    l.exit.selector = '';
  },
  'patch-invalid': (l) => {
    repairAt(l, 0, 0).patches = [{ op: 'css', css: '' }];
  },
  'schema-invalid': (l) => {
    Object.assign(l, { chapter: 'cellar' });
  },
};

/** A copy of the valid level with exactly one rule broken. Typed as unknown, because it is not valid. */
export function faultyLevel(code: ErrorCode): unknown {
  const level = validLevel();
  FAULT_BREAKERS[code](level);
  return level;
}
