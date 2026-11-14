/** Time-domain analysis for tests and the render tool. Pure: no DOM. Spectral helpers are re-exported. */
export * from './spectral';

export function peak(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i] as number);
    if (a > p) p = a;
  }
  return p;
}

const toDb = (g: number): number => (g <= 0 ? -Infinity : 20 * Math.log10(g));

export function peakDb(x: Float32Array): number {
  return toDb(peak(x));
}

/** RMS of `x` between sample `from` (included) and `to` (excluded). */
export function rms(x: Float32Array, from = 0, to = x.length): number {
  const end = Math.min(to, x.length);
  if (end <= from) return 0;
  let s = 0;
  for (let i = from; i < end; i++) s += (x[i] as number) ** 2;
  return Math.sqrt(s / (end - from));
}

export function rmsDb(x: Float32Array, from = 0, to = x.length): number {
  return toDb(rms(x, from, to));
}

export function dcOffset(x: Float32Array): number {
  if (x.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] as number;
  return s / x.length;
}

export function allFinite(x: Float32Array): boolean {
  for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return false;
  return true;
}

export function crestFactorDb(x: Float32Array): number {
  return peakDb(x) - rmsDb(x);
}

/** RMS in windows of `windowS` seconds that do not overlap. */
export function rmsEnvelope(
  x: Float32Array,
  sampleRate: number,
  windowS = 0.005,
): { values: Float64Array; hopS: number } {
  const hop = Math.max(1, Math.round(sampleRate * windowS));
  const n = Math.floor(x.length / hop);
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = rms(x, i * hop, (i + 1) * hop);
  return { values, hopS: hop / sampleRate };
}

/** The time of the last window louder than `dbBelowPeak` under the loudest window. */
export function activeLength(x: Float32Array, sampleRate: number, dbBelowPeak = 40): number {
  const { values, hopS } = rmsEnvelope(x, sampleRate);
  let max = 0;
  for (const v of values) if (v > max) max = v;
  if (max === 0) return 0;
  const limit = max * 10 ** (-dbBelowPeak / 20);
  for (let i = values.length - 1; i >= 0; i--)
    if ((values[i] as number) >= limit) return (i + 1) * hopS;
  return 0;
}

/** The time of the loudest RMS window, in seconds. */
export function peakTime(x: Float32Array, sampleRate: number, windowS = 0.02): number {
  const { values, hopS } = rmsEnvelope(x, sampleRate, windowS);
  let best = 0;
  for (let i = 1; i < values.length; i++)
    if ((values[i] as number) > (values[best] as number)) best = i;
  return (best + 0.5) * hopS;
}

/** Reverberation time (60 dB) from Schroeder's backward integration, fitted between -5 and -35 dB. */
export function rt60(x: Float32Array, sampleRate: number): number {
  const edc = new Float64Array(x.length);
  let sum = 0;
  for (let i = x.length - 1; i >= 0; i--) {
    sum += (x[i] as number) ** 2;
    edc[i] = sum;
  }
  const total = edc[0] as number;
  if (!(total > 0)) return 0;
  let t5 = -1;
  let t35 = -1;
  for (let i = 0; i < edc.length; i++) {
    const db = 10 * Math.log10((edc[i] as number) / total);
    if (t5 < 0 && db <= -5) t5 = i;
    if (t35 < 0 && db <= -35) {
      t35 = i;
      break;
    }
  }
  if (t5 < 0 || t35 < 0) return 0;
  return (2 * (t35 - t5)) / sampleRate;
}

/** A 32-bit hash of the sample bits, as 8 hex digits. For determinism checks. */
export function hashSamples(x: Float32Array): string {
  const view = new DataView(x.buffer, x.byteOffset, x.byteLength);
  let h = 2166136261;
  for (let i = 0; i < x.byteLength; i++) {
    h ^= view.getUint8(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** A 16-bit mono WAV file. */
export function encodeWav(x: Float32Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + x.length * 2);
  const v = new DataView(out.buffer);
  const text = (at: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + x.length * 2, true);
  text(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) {
    const s = Math.max(-1, Math.min(1, x[i] as number));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return out;
}
