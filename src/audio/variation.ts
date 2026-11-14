import type { Rng } from '../engine/index';

/** The most a sound may vary on each play. */
export interface VariationLimits {
  /** Pitch, in cents (100 cents is one semitone). */
  pitchCents: number;
  /** Level, in dB. */
  levelDb: number;
  /** Filter frequency, as a fraction (0.08 is 8%). */
  filter: number;
}

export const DEFAULT_LIMITS: VariationLimits = { pitchCents: 50, levelDb: 2, filter: 0.08 };

export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

/** The cents that match a pitch change of `percent` percent. */
export function percentToCents(percent: number): number {
  return 1200 * Math.log2(1 + percent / 100);
}

/** The tab tick varies its pitch by 5% on each press. */
export const TAB_TICK_LIMITS: VariationLimits = {
  ...DEFAULT_LIMITS,
  pitchCents: percentToCents(5),
};

export interface VariationBase {
  freqHz: number;
  levelDb: number;
  filterHz: number;
}

export interface Varied extends VariationBase {
  cents: number;
}

/** Draws three numbers from the generator, always in the same order, and applies them. */
export function vary(
  rng: Rng,
  base: VariationBase,
  limits: VariationLimits = DEFAULT_LIMITS,
): Varied {
  const a = rng.next() * 2 - 1;
  const b = rng.next() * 2 - 1;
  const c = rng.next() * 2 - 1;
  const cents = a * limits.pitchCents;
  return {
    cents,
    freqHz: base.freqHz * centsToRatio(cents),
    levelDb: base.levelDb + b * limits.levelDb,
    filterHz: base.filterHz * (1 + c * limits.filter),
  };
}

/** The same result as `vary`, with no change at all. Used when variation is off. */
export function noVariation(base: VariationBase): Varied {
  return { ...base, cents: 0 };
}
