/** Frequency analysis: FFT, averaged power spectrum, centroid, peaks, modulation rate, spectrogram. */

/** In-place radix-2 FFT. The length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
      [im[i], im[j]] = [im[j] as number, im[i] as number];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = (re[b] as number) * cr - (im[b] as number) * ci;
        const ti = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - tr;
        im[b] = (im[a] as number) - ti;
        re[a] = (re[a] as number) + tr;
        im[a] = (im[a] as number) + ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export interface Spectrum {
  /** Power per bin, from 0 Hz to Nyquist (size / 2 + 1 bins). */
  power: Float64Array;
  binHz: number;
}

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/** Average power spectrum over windows of `size` samples (zero-padded when the signal is shorter). */
export function spectrum(x: Float32Array, sampleRate: number, size = 8192): Spectrum {
  const win = hann(size);
  const power = new Float64Array(size / 2 + 1);
  const hop = size / 2;
  let frames = 0;
  for (let start = 0; start === 0 || start + size <= x.length; start += hop) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = (x[start + i] ?? 0) * (win[i] as number);
    fft(re, im);
    for (let k = 0; k <= size / 2; k++) {
      power[k] = (power[k] as number) + (re[k] as number) ** 2 + (im[k] as number) ** 2;
    }
    frames++;
  }
  for (let k = 0; k < power.length; k++) power[k] = (power[k] as number) / frames;
  return { power, binHz: sampleRate / size };
}

/** The magnitude-weighted mean frequency. */
export function centroid(s: Spectrum): number {
  let num = 0;
  let den = 0;
  for (let k = 1; k < s.power.length; k++) {
    const m = Math.sqrt(s.power[k] as number);
    num += m * k * s.binHz;
    den += m;
  }
  return den === 0 ? 0 : num / den;
}

/** Energy between two frequencies, in dB (arbitrary reference: compare two values only). */
export function bandEnergyDb(s: Spectrum, loHz: number, hiHz: number): number {
  let sum = 0;
  for (let k = 0; k < s.power.length; k++) {
    const f = k * s.binHz;
    if (f >= loHz && f <= hiHz) sum += s.power[k] as number;
  }
  return 10 * Math.log10(sum + 1e-30);
}

export interface PeakHit {
  freqHz: number;
  /** Power of the peak over the median power, in dB. */
  prominenceDb: number;
}

/**
 * The strongest local maximum within +/- `relWindow` of `hz`, with parabolic interpolation.
 * Returns null when there is none.
 */
export function peakNear(s: Spectrum, hz: number, relWindow: number): PeakHit | null {
  const lo = Math.max(1, Math.floor((hz * (1 - relWindow)) / s.binHz));
  const hi = Math.min(s.power.length - 2, Math.ceil((hz * (1 + relWindow)) / s.binHz));
  let best = -1;
  for (let k = lo; k <= hi; k++) {
    const p = s.power[k] as number;
    if (p >= (s.power[k - 1] as number) && p > (s.power[k + 1] as number)) {
      if (best < 0 || p > (s.power[best] as number)) best = k;
    }
  }
  if (best < 0) return null;
  const a = Math.log((s.power[best - 1] as number) + 1e-30);
  const b = Math.log((s.power[best] as number) + 1e-30);
  const c = Math.log((s.power[best + 1] as number) + 1e-30);
  const denom = a - 2 * b + c;
  const shift = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
  const sorted = Array.from(s.power).sort((p, q) => p - q);
  const median = sorted[Math.floor(sorted.length / 2)] as number;
  return {
    freqHz: (best + shift) * s.binHz,
    prominenceDb: 10 * Math.log10(((s.power[best] as number) + 1e-30) / (median + 1e-30)),
  };
}

/** The strongest rate (Hz) in the loudness envelope between `minHz` and `maxHz`. */
export function modulationRate(x: Float32Array, sampleRate: number, minHz = 1, maxHz = 40): number {
  const hop = Math.round(sampleRate / 200);
  const env: number[] = [];
  for (let i = 0; i + hop <= x.length; i += hop) {
    let e = 0;
    for (let j = 0; j < hop; j++) e += (x[i + j] as number) ** 2;
    env.push(Math.sqrt(e / hop));
  }
  const envRate = sampleRate / hop;
  let size = 1;
  while (size < env.length) size <<= 1;
  size = Math.max(size, 256);
  const mean = env.reduce((p, q) => p + q, 0) / Math.max(1, env.length);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const win = hann(env.length);
  for (let i = 0; i < env.length; i++) re[i] = ((env[i] as number) - mean) * (win[i] as number);
  fft(re, im);
  let best = 0;
  let bestP = -1;
  for (let k = 1; k < size / 2; k++) {
    const f = (k * envRate) / size;
    if (f < minHz || f > maxHz) continue;
    const p = (re[k] as number) ** 2 + (im[k] as number) ** 2;
    if (p > bestP) {
      bestP = p;
      best = f;
    }
  }
  return best;
}

/** Spectrogram frames in dB (0 at the loudest cell), `size / 2` bins each. */
export function spectrogram(
  x: Float32Array,
  size = 1024,
  hop = 512,
): { frames: Float32Array[]; maxDb: number } {
  const win = hann(size);
  const frames: Float32Array[] = [];
  let maxDb = -Infinity;
  for (let start = 0; start + size <= x.length || start === 0; start += hop) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = (x[start + i] ?? 0) * (win[i] as number);
    fft(re, im);
    const f = new Float32Array(size / 2);
    for (let k = 0; k < size / 2; k++) {
      const db = 10 * Math.log10((re[k] as number) ** 2 + (im[k] as number) ** 2 + 1e-20);
      f[k] = db;
      if (db > maxDb) maxDb = db;
    }
    frames.push(f);
  }
  return { frames, maxDb };
}
