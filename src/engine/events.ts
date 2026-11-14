/** Every kind of event the engine emits. The shell announces each one. */
export const EVENT_KINDS = [
  'ghost-met',
  'repair-chosen',
  'focus-restored',
  'ghost-released',
  'level-solved',
  'undone',
  'level-reset',
  'nothing-to-undo',
  'rejected',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type RejectReason = 'unknown-ghost' | 'unknown-repair' | 'already-released';

/** `ghost` and `repair` are ids. `level` is the level id. */
export type EngineEvent =
  | { kind: 'ghost-met'; ghost: string }
  | { kind: 'repair-chosen'; ghost: string; repair: string; correct: boolean; why?: string }
  | { kind: 'focus-restored'; ghost: string }
  | { kind: 'ghost-released'; ghost: string; releaseLine: string }
  | { kind: 'level-solved'; level: string }
  | { kind: 'undone'; level: string }
  | { kind: 'level-reset'; level: string }
  | { kind: 'nothing-to-undo'; level: string }
  | { kind: 'rejected'; reason: RejectReason; ghost?: string; repair?: string };

export type Action =
  | { type: 'meet'; ghost: string }
  | { type: 'repair'; ghost: string; repair: string }
  | { type: 'undo' }
  | { type: 'reset' };
