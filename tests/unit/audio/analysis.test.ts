import { describe, expect, it } from 'vitest';
import {
  activeLength,
  allFinite,
  centroid,
  crestFactorDb,
  dcOffset,
  encodeWav,
  hashSamples,
  modulationRate,
  peak,
  peakDb,
  peakNear,
  peakTime,
  rms,
  rmsDb,
  rt60,
  spectrogram,
  spectrum,
} from '../../../src/audio/analysis';

const SR = 22050;
function sine(freq: number, seconds: number, amp = 1): Float32Array {
  const x = new Float32Array(Math.round(SR * seconds));
  for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return x;
}

describe('analysis', () => {
  it('measures a sine', () => {
    const x = sine(1000, 1, 0.5);
    expect(peak(x)).toBeCloseTo(0.5, 3);
    expect(peakDb(x)).toBeCloseTo(-6.02, 1);
    expect(rms(x)).toBeCloseTo(0.5 / Math.SQRT2, 3);
    expect(rmsDb(x)).toBeCloseTo(-9.03, 1);
    expect(Math.abs(dcOffset(x))).toBeLessThan(1e-3);
    expect(crestFactorDb(x)).toBeCloseTo(3.01, 1);
    expect(allFinite(x)).toBe(true);
    const s = spectrum(x, SR);
    expect(centroid(s)).toBeCloseTo(1000, -1);
    const hit = peakNear(s, 1000, 0.05);
    expect(hit?.freqHz).toBeCloseTo(1000, -1);
    expect(hit?.prominenceDb).toBeGreaterThan(30);
  });

  it('handles silence and non-finite values', () => {
    const z = new Float32Array(1000);
    expect(peak(z)).toBe(0);
    expect(rmsDb(z)).toBe(-Infinity);
    expect(activeLength(z, SR)).toBe(0);
    expect(rt60(z, SR)).toBe(0);
    expect(allFinite(new Float32Array([1, Number.NaN]))).toBe(false);
  });

  it('measures length and the loudest time', () => {
    const x = new Float32Array(SR);
    x.set(sine(500, 0.2), 0);
    expect(activeLength(x, SR)).toBeCloseTo(0.2, 1);
    expect(peakTime(x, SR)).toBeLessThan(0.2);
  });

  it('measures the decay time of a known decay', () => {
    const x = new Float32Array(Math.round(SR * 2.5));
    let seed = 1;
    for (let i = 0; i < x.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      x[i] = ((seed / 4294967296) * 2 - 1) * Math.exp((-6.9078 * (i / SR)) / 1.5);
    }
    expect(rt60(x, SR)).toBeGreaterThan(1.35);
    expect(rt60(x, SR)).toBeLessThan(1.65);
  });

  it('finds the rate of a loudness wobble', () => {
    const x = sine(800, 3);
    for (let i = 0; i < x.length; i++) {
      (x as Float32Array)[i] =
        (x[i] as number) * (0.6 + 0.4 * Math.sin((2 * Math.PI * 4 * i) / SR));
    }
    expect(modulationRate(x, SR)).toBeGreaterThan(3.5);
    expect(modulationRate(x, SR)).toBeLessThan(4.5);
  });

  it('hashes, encodes and draws', () => {
    const a = sine(300, 0.1);
    expect(hashSamples(a)).toBe(hashSamples(sine(300, 0.1)));
    expect(hashSamples(a)).not.toBe(hashSamples(sine(301, 0.1)));
    expect(encodeWav(a, SR)).toHaveLength(44 + a.length * 2);
    const g = spectrogram(a, 256, 128);
    expect(g.frames.length).toBeGreaterThan(2);
    expect(Number.isFinite(g.maxDb)).toBe(true);
  });
});
