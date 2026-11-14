// The public API of the engine. Nothing outside this file is public.
export { clamp } from './clamp';
export { createEngine, step, isSolved, activePatches, ambient, canonical } from './engine';
export type { Engine, StepResult } from './engine';
export { EVENT_KINDS } from './events';
export type { Action, EngineEvent, EventKind, RejectReason } from './events';
export { checkInvariants } from './invariants';
export type { Violation } from './invariants';
export { parseLevel } from './parse';
export { restoreGame } from './restore';
export { createRng } from './rng';
export type { Rng } from './rng';
export type { Rules, ValidateResult } from './rules';
export {
  BARRIER_KINDS,
  CHAPTER_IDS,
  ERROR_CODES,
  LAYER_IDS,
  barrierKindSchema,
  chapterIdSchema,
  ghostSchema,
  layerIdSchema,
  levelSchema,
  repairPatchSchema,
  repairSchema,
  wcagSchema,
} from './schema';
export type {
  BarrierKind,
  ChapterId,
  ErrorCode,
  Ghost,
  LayerId,
  Level,
  ParseError,
  ParseResult,
  Repair,
  RepairPatch,
  Wcag,
} from './schema';
export { progress, remaining } from './selectors';
export type { Progress } from './selectors';
export { AMBIENT_MIN, HISTORY_LIMIT, createGame, gameStateSchema } from './state';
export type { GameState, GhostRecord, GhostState } from './state';
export { WCAG_TABLE, findWcag, understandingUrl } from './wcag';
export type { WcagLevel, WcagRow } from './wcag';
