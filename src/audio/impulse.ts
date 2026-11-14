import type { Rng } from '../engine/index';

/** Room (echo) seconds per chapter. The sound bible has no Porch value; 0.5 is the brief's choice. */
export const ROOM_SECONDS = {
  porch: 0.5,
  foyer: 0.9,
  chapel: 3.2,
  gallery: 1.6,
  library: 0.7,
  attic: 1.2,
  finale: 2.0,
} as const;

/** Amplitude factor for 60 dB of decay: ln(1000). */
const LN_1000 = Math.log(1000);

export interface ImpulseOptions {
  /** How many early reflections to place in the first 80 ms. */
  earlyCount?: number;
  lowpassFromHz?: number;
  lowpassToHz?: number;
}

/**
 * A room impulse: noise that fades by 60 dB in `seconds`, a few early reflections, and a low-pass
 * that closes over time. The same generator state gives the same impulse.
 */
export function generateImpulse(
  seconds: number,
  sampleRate: number,
  rng: Rng,
  options: ImpulseOptions = {},
): Float32Array {
  const { earlyCount = 8, lowpassFromHz = 12000, lowpassToHz = 2500 } = options;
  const length = Math.ceil(seconds * 1.25 * sampleRate);
  const out = new Float32Array(length);
  let lp = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp((-LN_1000 * t) / seconds);
    const cutoff = lowpassFromHz + (lowpassToHz - lowpassFromHz) * Math.min(1, t / seconds);
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    lp += a * (rng.next() * 2 - 1 - lp);
    out[i] = lp * env;
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i] as number));
  const noiseScale = peak > 0 ? 0.6 / peak : 1;
  for (let i = 0; i < length; i++) out[i] = (out[i] as number) * noiseScale;
  for (let k = 0; k < earlyCount; k++) {
    const at = Math.floor((0.005 + rng.next() * 0.075) * sampleRate);
    const sign = rng.next() < 0.5 ? -1 : 1;
    if (at < length) out[at] = (out[at] as number) + sign * (0.6 - (0.4 * k) / earlyCount);
  }
  return out;
}
