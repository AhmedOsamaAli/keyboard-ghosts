export type WcagLevel = 'A' | 'AA';

export interface WcagRow {
  sc: string;
  name: string;
  level: WcagLevel;
  slug: string;
}

/** WCAG 2.2 success criteria used by the game. */
export const WCAG_TABLE: readonly WcagRow[] = [
  { sc: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', slug: 'contrast-minimum' },
  {
    sc: '1.4.13',
    name: 'Content on Hover or Focus',
    level: 'AA',
    slug: 'content-on-hover-or-focus',
  },
  { sc: '2.1.1', name: 'Keyboard', level: 'A', slug: 'keyboard' },
  { sc: '2.1.2', name: 'No Keyboard Trap', level: 'A', slug: 'no-keyboard-trap' },
  { sc: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', slug: 'pause-stop-hide' },
  { sc: '2.4.1', name: 'Bypass Blocks', level: 'A', slug: 'bypass-blocks' },
  { sc: '2.4.3', name: 'Focus Order', level: 'A', slug: 'focus-order' },
  { sc: '2.4.7', name: 'Focus Visible', level: 'AA', slug: 'focus-visible' },
  {
    sc: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    level: 'AA',
    slug: 'focus-not-obscured-minimum',
  },
  { sc: '2.5.7', name: 'Dragging Movements', level: 'AA', slug: 'dragging-movements' },
  { sc: '3.3.1', name: 'Error Identification', level: 'A', slug: 'error-identification' },
  { sc: '3.3.2', name: 'Labels or Instructions', level: 'A', slug: 'labels-or-instructions' },
  { sc: '4.1.2', name: 'Name, Role, Value', level: 'A', slug: 'name-role-value' },
  { sc: '4.1.3', name: 'Status Messages', level: 'AA', slug: 'status-messages' },
];

export function findWcag(sc: string): WcagRow | undefined {
  return WCAG_TABLE.find((row) => row.sc === sc);
}

/** The W3C "Understanding" page for a success criterion. Throws for an unknown number. */
export function understandingUrl(sc: string): string {
  const row = findWcag(sc);
  if (!row) throw new RangeError(`Unknown WCAG success criterion: ${sc}`);
  return `https://www.w3.org/WAI/WCAG22/Understanding/${row.slug}.html`;
}
