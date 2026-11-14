import type { Rng } from '../../engine/index';
import { brownNoise, whiteNoise } from '../noise';
import type { Settings } from './params';

/** A one-pole low-pass, in place. */
export function lowpassInPlace(x: Float32Array, cutoffHz: number, sampleRate: number): void {
  const a = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * ((x[i] as number) - y);
    x[i] = y;
  }
}

/** One click: a short noise burst through a high-pass whose cutoff drops a little. */
export function clickInto(
  out: Float32Array,
  start: number,
  rng: Rng,
  sampleRate: number,
  s: Settings,
  level: number,
): void {
  const length = Math.max(8, Math.round(((s['clickMs'] ?? 8) / 1000) * sampleRate));
  const hp = s['highpassHz'] ?? 2500;
  const drop = 2 ** ((s['dropCents'] ?? 0) / 1200);
  let low = 0;
  for (let i = 0; i < length && start + i < out.length; i++) {
    const u = i / length;
    const cutoff = hp * drop ** (1 - u);
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    const white = rng.next() * 2 - 1;
    low += a * (white - low);
    const env = Math.exp(-6.9 * u);
    out[start + i] = (out[start + i] as number) + (white - low) * env * level;
  }
}

/** A single click, or a whole loop of ticks (tick and tock) when `loopSeconds` is given. */
export function tickBuffer(
  rng: Rng,
  sampleRate: number,
  s: Settings,
  loopSeconds?: number,
): Float32Array {
  const clickLength = Math.round(((s['clickMs'] ?? 8) / 1000) * sampleRate) + 16;
  if (!loopSeconds) {
    const out = new Float32Array(clickLength);
    clickInto(out, 0, rng, sampleRate, s, s['level'] ?? 1);
    return out;
  }
  const out = new Float32Array(Math.round(loopSeconds * sampleRate));
  const period = s['periodS'] ?? 1;
  for (let k = 0; k * period < loopSeconds; k++) {
    const level = k % 2 === 0 ? (s['level'] ?? 1) : (s['tockLevel'] ?? 0.7);
    clickInto(out, Math.round(k * period * sampleRate), rng, sampleRate, s, level);
  }
  return out;
}

/** A fire: a low rumble and sparse crackles (random short bursts of different sizes). */
export function fireBuffer(
  rng: Rng,
  sampleRate: number,
  seconds: number,
  s: Settings,
): Float32Array {
  const length = Math.round(seconds * sampleRate);
  const out = brownNoise(rng.fork('rumble'), length);
  lowpassInPlace(out, s['rumbleHz'] ?? 90, sampleRate);
  const rumble = s['rumbleLevel'] ?? 0.15;
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i] as number));
  const scale = peak > 0 ? rumble / peak : 0;
  for (let i = 0; i < length; i++) out[i] = (out[i] as number) * scale;
  const crackle = rng.fork('crackle');
  const rate = s['crackleRate'] ?? 7;
  const level = s['crackleLevel'] ?? 1;
  const mean = sampleRate / rate;
  let at = Math.floor(-Math.log(1 - crackle.next()) * mean);
  while (at < length) {
    const size = Math.max(12, Math.round((0.001 + crackle.next() * 0.003) * sampleRate));
    const amp = level * (0.15 + 0.85 * crackle.next() ** 2);
    const burst = whiteNoise(crackle, size);
    for (let i = 0; i < size && at + i < length; i++) {
      out[at + i] =
        (out[at + i] as number) + (burst[i] as number) * amp * Math.exp((-5 * i) / size);
    }
    at += Math.max(1, Math.floor(-Math.log(1 - crackle.next()) * mean));
  }
  return out;
}
