/** Mix maths: dB and gain, the master range, the soft clipper and a model of the limiter. */
export const CEILING_DB = -1;
export const CEILING = 10 ** (CEILING_DB / 20);
export const MASTER_MIN_DB = -40;
export const MASTER_MAX_DB = 0;
export const MASTER_DEFAULT_DB = -6;
/** The compressor threshold (dB) and ratio of the limiter, as in the brief. */
export const LIMITER_THRESHOLD_DB = -6;
export const LIMITER_RATIO = 20;

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

export function gainToDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain);
}

/** Keeps a master level inside -40 to 0 dB. A value that is not a number gives the default. */
export function clampMaster(db: number): number {
  if (Number.isNaN(db)) return MASTER_DEFAULT_DB;
  return Math.min(MASTER_MAX_DB, Math.max(MASTER_MIN_DB, db));
}

/** Finds k so that ceiling * k / tanh(k) = 1: the clipper has gain 1 for quiet signals. */
function solveK(): number {
  let lo = 0.01;
  let hi = 5;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if ((CEILING * mid) / Math.tanh(mid) < 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const SOFT_CLIP_K = solveK();

/** The clipper for one sample. The input is clamped to [-1, 1]. The output never exceeds the ceiling. */
export function softClip(x: number): number {
  const c = Math.min(1, Math.max(-1, x));
  return (CEILING * Math.tanh(SOFT_CLIP_K * c)) / Math.tanh(SOFT_CLIP_K);
}

/** The curve for a `WaveShaperNode`: `count` points from -1 to 1. */
export function softClipCurve(count = 4097): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = softClip(-1 + (2 * i) / (count - 1));
  return out;
}

/** A model of the limiter for one peak value: the compressor above its threshold, then the clipper. */
export function limiterModel(peak: number): number {
  const p = Math.abs(peak);
  if (!Number.isFinite(p)) return CEILING;
  const threshold = dbToGain(LIMITER_THRESHOLD_DB);
  let level = p;
  if (p > threshold) {
    const over = gainToDb(p) - LIMITER_THRESHOLD_DB;
    level = dbToGain(LIMITER_THRESHOLD_DB + over / LIMITER_RATIO);
  }
  return softClip(level);
}
