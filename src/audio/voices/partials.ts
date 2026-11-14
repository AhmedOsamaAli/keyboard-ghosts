import type { Settings } from './params';

export interface PartialSpec {
  ratio: number;
  level: number;
}

/** Reads `ratio1..n` and `level1..n` from the settings. */
export function readPartials(s: Settings, count: number): PartialSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    ratio: s[`ratio${i + 1}`] ?? 1,
    level: s[`level${i + 1}`] ?? 0,
  }));
}

/** Levels scaled so they sum to 1 (the peak of the voice cannot exceed 1 before the trim). */
export function normalised(parts: PartialSpec[]): PartialSpec[] {
  const total = parts.reduce((sum, p) => sum + p.level, 0) || 1;
  return parts.map((p) => ({ ratio: p.ratio, level: p.level / total }));
}

/** The time for a partial to fall 60 dB: the voice's tail divided by ratio ^ exponent. */
export function partialDecay(tailS: number, ratio: number, exponent: number): number {
  return tailS / Math.max(0.05, ratio) ** exponent;
}
