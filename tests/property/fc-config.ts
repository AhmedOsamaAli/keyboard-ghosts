/** Shared fast-check settings. FC_SEED (an integer) makes a run repeatable. */
export const NUM_RUNS = 200;

export interface FcParams {
  numRuns: number;
  seed?: number;
}

/** Reads an FC_SEED value. Returns undefined when it is missing or not an integer. */
export function parseSeed(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const text = raw.trim();
  if (!/^-?\d+$/.test(text)) return undefined;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : undefined;
}

export function makeParams(raw: string | undefined): FcParams {
  const seed = parseSeed(raw);
  return seed === undefined ? { numRuns: NUM_RUNS } : { numRuns: NUM_RUNS, seed };
}

export const fcParams: FcParams = makeParams(process.env['FC_SEED']);
