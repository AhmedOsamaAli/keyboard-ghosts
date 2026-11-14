import type { Rng } from '../engine/index';

/** White noise in [-1, 1) from a seeded generator. */
export function whiteNoise(rng: Rng, length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = rng.next() * 2 - 1;
  return out;
}

/** Pink noise (Paul Kellet's filter), scaled to stay inside [-1, 1]. */
export function pinkNoise(rng: Rng, length: number): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = rng.next() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    out[i] = Math.max(-1, Math.min(1, pink * 0.11));
  }
  return out;
}

/** Brown noise (a leaky sum of white noise), scaled to stay inside [-1, 1]. */
export function brownNoise(rng: Rng, length: number): Float32Array {
  const out = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = rng.next() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    out[i] = Math.max(-1, Math.min(1, last * 3.5));
  }
  return out;
}
