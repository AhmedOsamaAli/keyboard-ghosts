/** The focus filter: frequencies and glide times from the sound bible. */
export const FOCUS_OPEN_HZ = 9000;
export const FOCUS_CLOSED_HZ = 350;
export const FOCUS_CLOSE_SECONDS = 0.35;
export const FOCUS_OPEN_SECONDS = 0.12;

function inRange(hz: number): number {
  return Math.min(FOCUS_OPEN_HZ, Math.max(FOCUS_CLOSED_HZ, hz));
}

/**
 * The filter frequency `t` seconds into a glide from `from` to `to` that lasts `duration` seconds.
 * The path is straight on a log-frequency axis. It is exact at both ends and always inside 350 to 9,000 Hz.
 */
export function focusFrequency(from: number, to: number, duration: number, t: number): number {
  const a = inRange(from);
  const b = inRange(to);
  if (!(duration > 0) || t >= duration) return b;
  if (!(t > 0)) return a;
  const f = Math.exp(Math.log(a) + (t / duration) * (Math.log(b) - Math.log(a)));
  return Math.min(Math.max(a, b), Math.max(Math.min(a, b), f));
}

/** `count` points of a glide, for `setValueCurveAtTime`. */
export function focusCurveSamples(from: number, to: number, count = 64): Float32Array {
  const n = Math.max(2, Math.floor(count));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = focusFrequency(from, to, n - 1, i);
  return out;
}
