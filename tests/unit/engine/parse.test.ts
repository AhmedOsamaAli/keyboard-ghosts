import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../src/engine/parse';
import { ERROR_CODES, type ErrorCode } from '../../../src/engine/schema';
import { countWords } from '../../../src/engine/words';
import { FAULT_BREAKERS, faultyLevel, validLevel } from '../../fixtures/levels/single-faults';

function codesOf(input: unknown): ErrorCode[] {
  const result = parseLevel(input);
  return result.ok ? [] : [...new Set(result.errors.map((e) => e.code))];
}

describe('parseLevel', () => {
  it('accepts the valid fixture and returns the same data', () => {
    const level = validLevel();
    const result = parseLevel(structuredClone(level));
    expect(result).toEqual({ ok: true, level });
  });

  it.each(ERROR_CODES)('gives exactly %s for its single fault', (code) => {
    const result = parseLevel(faultyLevel(code));
    expect(result.ok).toBe(false);
    expect(codesOf(faultyLevel(code))).toEqual([code]);
  });

  it('has a breaker for every code', () => {
    expect(Object.keys(FAULT_BREAKERS).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('reports a missing ghost selector as selector-empty', () => {
    const level = validLevel();
    const ghost = structuredClone(level.ghosts[0]) as Record<string, unknown>;
    delete ghost['selector'];
    expect(codesOf({ ...level, ghosts: [ghost, ...level.ghosts.slice(1)] })).toEqual([
      'selector-empty',
    ]);
  });

  it('reports a missing exit as exit-selector-missing', () => {
    const rest: Record<string, unknown> = { ...validLevel() };
    delete rest['exit'];
    expect(codesOf(rest)).toEqual(['exit-selector-missing']);
    expect(codesOf({ ...rest, exit: {} })).toEqual(['exit-selector-missing']);
  });

  it('reports anything wrong inside a patch as patch-invalid', () => {
    const bad = [
      { op: 'css' },
      { op: 'attr', selector: '', name: 'x', value: null },
      { op: 'attr', selector: 'a', name: 'x', value: 3 },
      { op: 'text', selector: 'a' },
      { op: 'behavior', name: '' },
      { op: 'teleport' },
      'not a patch',
    ];
    for (const patch of bad) {
      const level = validLevel();
      Object.assign(level.ghosts[0]?.repairs[0] ?? {}, { patches: [patch] });
      const result = parseLevel(level);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.map((e) => e.code)).toEqual(['patch-invalid']);
        expect(result.errors[0]?.path).toEqual(['ghosts', 0, 'repairs', 0, 'patches', 0]);
      }
    }
  });

  it('reports a repair with no patch as patch-invalid', () => {
    const level = validLevel();
    Object.assign(level.ghosts[0]?.repairs[0] ?? {}, { patches: [] });
    expect(codesOf(level)).toEqual(['patch-invalid']);
  });

  it('reports every fault when there are several', () => {
    const level = validLevel();
    for (const code of [
      'level-id-invalid',
      'line-too-long',
      'layers-none',
      'patch-invalid',
    ] as const) {
      FAULT_BREAKERS[code](level);
    }
    FAULT_BREAKERS['schema-invalid'](level);
    expect(codesOf(level).sort()).toEqual(
      [
        'layers-none',
        'level-id-invalid',
        'line-too-long',
        'patch-invalid',
        'schema-invalid',
      ].sort(),
    );
  });

  it('still runs the rule checks when the shape check fails elsewhere', () => {
    const level = validLevel();
    Object.assign(level, { chapter: 'cellar', title: 3 });
    FAULT_BREAKERS['wcag-unknown'](level);
    FAULT_BREAKERS['ghost-id-duplicate'](level);
    expect(codesOf(level).sort()).toEqual(['ghost-id-duplicate', 'schema-invalid', 'wcag-unknown']);
  });

  it('gives schema-invalid for input that is not an object', () => {
    for (const input of [null, undefined, 3, 'level', [], true]) {
      expect(codesOf(input)).toEqual(['schema-invalid']);
    }
  });

  it('reports a wcag name that differs from the table', () => {
    const level = validLevel();
    const w = level.ghosts[0]?.wcag[0];
    if (w) w.name = 'Focus Hidden';
    expect(codesOf(level)).toEqual(['wcag-unknown']);
  });

  it('reports a decoy reason with two sentences or too many words', () => {
    const two = validLevel();
    Object.assign(two.ghosts[0]?.repairs[1] ?? {}, { why: 'It fails. It hides the ring.' });
    expect(codesOf(two)).toEqual(['line-too-long']);
    const long = validLevel();
    Object.assign(long.ghosts[0]?.repairs[1] ?? {}, { why: Array(21).fill('word').join(' ') });
    expect(codesOf(long)).toEqual(['line-too-long']);
  });

  it('reports a decoy with an empty reason', () => {
    const level = validLevel();
    Object.assign(level.ghosts[0]?.repairs[1] ?? {}, { why: '  ' });
    expect(codesOf(level)).toEqual(['decoy-without-reason']);
  });

  it('never reports the same code and path twice', () => {
    const level = validLevel();
    const compatible: ErrorCode[] = [
      'level-id-invalid',
      'ghost-id-duplicate',
      'decoy-without-reason',
      'line-too-long',
      'wcag-unknown',
      'selector-empty',
      'layers-none',
      'exit-selector-missing',
      'patch-invalid',
      'schema-invalid',
    ];
    for (const code of compatible) FAULT_BREAKERS[code](level);
    const result = parseLevel(level);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const keys = result.errors.map((e) => `${e.code}|${e.path.join('.')}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('writes messages of 14 words or less', () => {
    for (const code of ERROR_CODES) {
      const result = parseLevel(faultyLevel(code));
      if (result.ok) continue;
      for (const e of result.errors) {
        expect(e.message.length).toBeGreaterThan(0);
        for (const sentence of e.message.split(/(?<=[.!?])\s+/)) {
          expect(countWords(sentence)).toBeLessThanOrEqual(14);
        }
      }
    }
  });
});
