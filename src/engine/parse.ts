import { findWcag } from './wcag';
import { countWords, isKebabCase, isSingleSentence } from './words';
import { levelSchema, type ErrorCode, type ParseError, type ParseResult } from './schema';

type Path = (string | number)[];
type Raw = Record<string, unknown>;

function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/** Turn a zod issue path into a named code and a normalised path. */
function mapIssuePath(raw: readonly PropertyKey[]): { code: ErrorCode; path: Path } {
  const path: Path = raw.map((p) => (typeof p === 'symbol' ? String(p) : p));
  if (path[0] === 'exit') return { code: 'exit-selector-missing', path: ['exit', 'selector'] };
  if (path[0] === 'ghosts' && path[2] === 'selector' && path.length === 3) {
    return { code: 'selector-empty', path };
  }
  const p = path.indexOf('patches');
  if (path[0] === 'ghosts' && p >= 0 && path.length > p + 1) {
    return { code: 'patch-invalid', path: path.slice(0, p + 2) };
  }
  const w = path.indexOf('wcag');
  if (path[0] === 'ghosts' && w === 2 && path.length > w + 1) {
    return { code: 'wcag-unknown', path: path.slice(0, w + 2) };
  }
  return { code: 'schema-invalid', path };
}

const SHAPE_MESSAGES: Record<string, string> = {
  'exit-selector-missing': 'The exit needs a selector.',
  'selector-empty': 'The ghost needs a selector.',
  'patch-invalid': 'The patch is not valid.',
  'wcag-unknown': 'The WCAG entry is not valid.',
  'schema-invalid': 'The data has the wrong shape here.',
};

function patchProblem(patch: unknown): string | null {
  if (!isRecord(patch)) return 'The patch is not an object.';
  switch (patch['op']) {
    case 'css':
      return isNonEmpty(patch['css']) ? null : 'The css patch needs css.';
    case 'attr':
      if (!isNonEmpty(patch['selector'])) return 'The attr patch needs a selector.';
      if (!isNonEmpty(patch['name'])) return 'The attr patch needs a name.';
      if (patch['value'] !== null && typeof patch['value'] !== 'string') {
        return 'The attr value is a string or null.';
      }
      return null;
    case 'text':
      if (!isNonEmpty(patch['selector'])) return 'The text patch needs a selector.';
      return typeof patch['text'] === 'string' ? null : 'The text patch needs text.';
    case 'behavior':
      return isNonEmpty(patch['name']) ? null : 'The behavior patch needs a name.';
    default:
      return 'The patch has an unknown op.';
  }
}

function checkRepair(repair: unknown, path: Path, add: Adder): void {
  if (!isRecord(repair)) return;
  const label = repair['label'];
  if (typeof label === 'string' && label.length > 60) {
    add('line-too-long', [...path, 'label'], 'The label has more than 60 characters.');
  }
  const why = repair['why'];
  if (repair['correct'] === true && why !== undefined) {
    add('correct-with-reason', [...path, 'why'], 'The correct repair has no reason.');
  }
  if (repair['correct'] === false) {
    if (!isNonEmpty(why)) {
      add('decoy-without-reason', [...path, 'why'], 'A decoy needs a reason.');
    } else if (countWords(why as string) > 20 || !isSingleSentence(why as string)) {
      add('line-too-long', [...path, 'why'], 'The reason is one sentence of 20 words or less.');
    }
  }
  const patches = repair['patches'];
  if (Array.isArray(patches)) {
    if (patches.length === 0) {
      add('patch-invalid', [...path, 'patches'], 'A repair needs at least one patch.');
    }
    patches.forEach((patch: unknown, k) => {
      const problem = patchProblem(patch);
      if (problem) add('patch-invalid', [...path, 'patches', k], problem);
    });
  }
}

function checkGhost(ghost: unknown, path: Path, add: Adder): void {
  if (!isRecord(ghost)) return;
  const limits: [string, number, string][] = [
    ['line', 14, 'The line has more than 14 words.'],
    ['releaseLine', 14, 'The release line has more than 14 words.'],
    ['lesson', 40, 'The lesson has more than 40 words.'],
  ];
  for (const [key, max, message] of limits) {
    const text = ghost[key];
    if (typeof text === 'string' && countWords(text) > max) {
      add('line-too-long', [...path, key], message);
    }
  }
  if (typeof ghost['selector'] === 'string' && ghost['selector'].trim() === '') {
    add('selector-empty', [...path, 'selector'], 'The ghost needs a selector.');
  }
  const wcag = ghost['wcag'];
  if (Array.isArray(wcag)) {
    wcag.forEach((entry: unknown, k) => {
      if (!isRecord(entry) || typeof entry['sc'] !== 'string') return;
      const row = findWcag(entry['sc']);
      if (!row || entry['name'] !== row.name || entry['level'] !== row.level) {
        add(
          'wcag-unknown',
          [...path, 'wcag', k],
          'The WCAG number, name or level is not in the table.',
        );
      }
    });
  }
  const seenBy = ghost['seenBy'];
  if (isRecord(seenBy)) {
    const flags = [seenBy['axe'], seenBy['levelCheck'], seenBy['walk']];
    if (flags.every((f) => f === false)) {
      add('layers-none', [...path, 'seenBy'], 'At least one layer must see the ghost.');
    }
  }
  const repairs = ghost['repairs'];
  if (Array.isArray(repairs)) {
    if (repairs.length < 2 || repairs.length > 4) {
      add('repair-count', [...path, 'repairs'], 'A ghost has 2 to 4 repairs.');
    }
    const readable = repairs.every(
      (r: unknown) => isRecord(r) && typeof r['correct'] === 'boolean',
    );
    if (readable) {
      const correct = repairs.filter((r: unknown) => isRecord(r) && r['correct'] === true).length;
      if (correct === 0) {
        add('no-correct-repair', [...path, 'repairs'], 'One repair must be correct.');
      } else if (correct > 1) {
        add('multiple-correct-repairs', [...path, 'repairs'], 'Only one repair is correct.');
      }
    }
    repairs.forEach((repair: unknown, j) => checkRepair(repair, [...path, 'repairs', j], add));
  }
}

type Adder = (code: ErrorCode, path: Path, message: string) => void;

function ruleChecks(input: unknown, add: Adder): void {
  if (!isRecord(input)) return;
  const id = input['id'];
  if (typeof id === 'string' && !isKebabCase(id)) {
    add('level-id-invalid', ['id'], 'The level id is kebab-case.');
  }
  const exit = input['exit'];
  if (isRecord(exit) && typeof exit['selector'] === 'string' && exit['selector'].trim() === '') {
    add('exit-selector-missing', ['exit', 'selector'], 'The exit needs a selector.');
  }
  const ghosts = input['ghosts'];
  if (!Array.isArray(ghosts)) return;
  if (ghosts.length < 1 || ghosts.length > 8) {
    add('ghost-count', ['ghosts'], 'A level has 1 to 8 ghosts.');
  }
  const seen = new Set<string>();
  ghosts.forEach((ghost: unknown, i) => {
    if (isRecord(ghost) && typeof ghost['id'] === 'string') {
      if (!isKebabCase(ghost['id'])) {
        add('level-id-invalid', ['ghosts', i, 'id'], 'The ghost id is kebab-case.');
      }
      if (seen.has(ghost['id'])) {
        add('ghost-id-duplicate', ['ghosts', i, 'id'], 'Two ghosts share this id.');
      }
      seen.add(ghost['id']);
    }
    checkGhost(ghost, ['ghosts', i], add);
  });
}

/** Check a level. Reports every error it can find, not only the first. */
export function parseLevel(input: unknown): ParseResult {
  const errors: ParseError[] = [];
  const keys = new Set<string>();
  const add: Adder = (code, path, message) => {
    const key = `${code}|${path.join('.')}`;
    if (keys.has(key)) return;
    keys.add(key);
    errors.push({ code, path, message });
  };

  const shape = levelSchema.safeParse(input);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      const { code, path } = mapIssuePath(issue.path);
      add(code, path, SHAPE_MESSAGES[code] ?? 'The data is not valid.');
    }
    if (!isRecord(input)) {
      // Nothing else can be read.
      return { ok: false, errors };
    }
  }
  ruleChecks(input, add);

  if (shape.success && errors.length === 0) return { ok: true, level: shape.data };
  if (errors.length === 0) {
    add('schema-invalid', [], 'The data has the wrong shape.');
  }
  return { ok: false, errors };
}
