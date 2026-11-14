import { describe, expect, it } from 'vitest';
import { ERROR_CODES, levelSchema, repairPatchSchema } from '../../../src/engine/schema';
import valid from '../../fixtures/levels/valid-3-ghost.json';

describe('schema', () => {
  it('has 15 error codes, all different', () => {
    expect(ERROR_CODES).toHaveLength(15);
    expect(new Set(ERROR_CODES).size).toBe(15);
    expect(ERROR_CODES).toContain('schema-invalid');
  });
  it('reads the valid fixture', () => {
    expect(levelSchema.safeParse(valid).success).toBe(true);
  });
  it('reads each patch shape', () => {
    const ok = [
      { op: 'css', css: 'a:focus-visible { outline: 3px solid; }' },
      { op: 'attr', selector: 'button', name: 'aria-label', value: 'Close' },
      { op: 'attr', selector: 'button', name: 'title', value: null },
      { op: 'text', selector: 'h1', text: 'Hello' },
      { op: 'behavior', name: 'pause-carousel' },
    ];
    for (const patch of ok) expect(repairPatchSchema.safeParse(patch).success).toBe(true);
  });
  it('rejects a wrong patch', () => {
    const bad = [
      { op: 'css' },
      { op: 'attr', selector: 'a', name: 'x' },
      { op: 'move', name: 'x' },
      { op: 'behavior', name: 3 },
    ];
    for (const patch of bad) expect(repairPatchSchema.safeParse(patch).success).toBe(false);
  });
  it('rejects an unknown chapter and a wrong type', () => {
    expect(levelSchema.safeParse({ ...valid, chapter: 'cellar' }).success).toBe(false);
    expect(levelSchema.safeParse({ ...valid, title: 3 }).success).toBe(false);
    expect(levelSchema.safeParse(null).success).toBe(false);
  });
});
