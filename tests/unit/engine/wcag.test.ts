import { describe, expect, it } from 'vitest';
import { WCAG_TABLE, findWcag, understandingUrl } from '../../../src/engine/wcag';

const EXPECTED: [string, string, string, string][] = [
  ['1.4.3', 'Contrast (Minimum)', 'AA', 'contrast-minimum'],
  ['1.4.13', 'Content on Hover or Focus', 'AA', 'content-on-hover-or-focus'],
  ['2.1.1', 'Keyboard', 'A', 'keyboard'],
  ['2.1.2', 'No Keyboard Trap', 'A', 'no-keyboard-trap'],
  ['2.2.2', 'Pause, Stop, Hide', 'A', 'pause-stop-hide'],
  ['2.4.1', 'Bypass Blocks', 'A', 'bypass-blocks'],
  ['2.4.3', 'Focus Order', 'A', 'focus-order'],
  ['2.4.7', 'Focus Visible', 'AA', 'focus-visible'],
  ['2.4.11', 'Focus Not Obscured (Minimum)', 'AA', 'focus-not-obscured-minimum'],
  ['2.5.7', 'Dragging Movements', 'AA', 'dragging-movements'],
  ['3.3.1', 'Error Identification', 'A', 'error-identification'],
  ['3.3.2', 'Labels or Instructions', 'A', 'labels-or-instructions'],
  ['4.1.2', 'Name, Role, Value', 'A', 'name-role-value'],
  ['4.1.3', 'Status Messages', 'AA', 'status-messages'],
];

describe('wcag table', () => {
  it('has 14 rows', () => {
    expect(WCAG_TABLE).toHaveLength(14);
  });
  it.each(EXPECTED)('row %s', (sc, name, level, slug) => {
    expect(findWcag(sc)).toEqual({ sc, name, level, slug });
    expect(understandingUrl(sc)).toBe(`https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`);
  });
  it('has unique numbers', () => {
    expect(new Set(WCAG_TABLE.map((r) => r.sc)).size).toBe(14);
  });
  it('finds nothing for an unknown number', () => {
    expect(findWcag('9.9.9')).toBeUndefined();
    expect(() => understandingUrl('9.9.9')).toThrow(RangeError);
  });
});
