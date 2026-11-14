import { z } from 'zod';

export const CHAPTER_IDS = [
  'porch',
  'foyer',
  'chapel',
  'gallery',
  'library',
  'attic',
  'finale',
] as const;
export const chapterIdSchema = z.enum(CHAPTER_IDS);
export type ChapterId = z.infer<typeof chapterIdSchema>;

export const BARRIER_KINDS = [
  'focus-invisible',
  'unnamed-control',
  'no-skip-link',
  'keyboard-trap',
  'focus-lost-on-close',
  'auto-moving-content',
  'hover-only',
  'drag-only',
  'focus-obscured',
  'low-contrast',
  'unlabelled-field',
  'silent-error',
  'bad-focus-order',
  'fake-button',
  'several',
] as const;
export const barrierKindSchema = z.enum(BARRIER_KINDS);
export type BarrierKind = z.infer<typeof barrierKindSchema>;

export const LAYER_IDS = ['axe', 'level-check', 'walk'] as const;
export const layerIdSchema = z.enum(LAYER_IDS);
export type LayerId = z.infer<typeof layerIdSchema>;

/** Error codes of `parseLevel`: the 14 named codes and `schema-invalid`. */
export const ERROR_CODES = [
  'level-id-invalid',
  'ghost-count',
  'ghost-id-duplicate',
  'repair-count',
  'no-correct-repair',
  'multiple-correct-repairs',
  'decoy-without-reason',
  'correct-with-reason',
  'line-too-long',
  'wcag-unknown',
  'selector-empty',
  'layers-none',
  'exit-selector-missing',
  'patch-invalid',
  'schema-invalid',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const wcagSchema = z.object({
  sc: z.string(),
  name: z.string(),
  level: z.enum(['A', 'AA']),
});
export type Wcag = z.infer<typeof wcagSchema>;

export const repairPatchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('css'), css: z.string() }),
  z.object({
    op: z.literal('attr'),
    selector: z.string(),
    name: z.string(),
    value: z.string().nullable(),
  }),
  z.object({ op: z.literal('text'), selector: z.string(), text: z.string() }),
  z.object({ op: z.literal('behavior'), name: z.string() }),
]);
export type RepairPatch = z.infer<typeof repairPatchSchema>;

export const repairSchema = z.object({
  id: z.string(),
  // The first character is an uppercase letter. A machine cannot check "starts with a verb".
  label: z.string().regex(/^\p{Lu}/u),
  patches: z.array(repairPatchSchema),
  correct: z.boolean(),
  why: z.string().optional(),
});
export type Repair = z.infer<typeof repairSchema>;

export const seenBySchema = z.object({
  axe: z.boolean(),
  levelCheck: z.boolean(),
  walk: z.boolean(),
});
export type SeenBy = z.infer<typeof seenBySchema>;

export const ghostSchema = z.object({
  id: z.string(),
  name: z.string(),
  line: z.string(),
  barrier: barrierKindSchema,
  wcag: z.array(wcagSchema).min(1),
  selector: z.string(),
  lesson: z.string(),
  releaseLine: z.string(),
  seenBy: seenBySchema,
  repairs: z.array(repairSchema),
});
export type Ghost = z.infer<typeof ghostSchema>;

export const levelSchema = z.object({
  id: z.string(),
  chapter: chapterIdSchema,
  title: z.string(),
  look: z.string(),
  page: z.string(),
  exit: z.object({ selector: z.string() }),
  ghosts: z.array(ghostSchema),
  hiddenNote: z.string().optional(),
});
export type Level = z.infer<typeof levelSchema>;

export interface ParseError {
  code: ErrorCode;
  path: (string | number)[];
  message: string;
}

export type ParseResult = { ok: true; level: Level } | { ok: false; errors: ParseError[] };
