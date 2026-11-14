import { describe, expect, it } from 'vitest';
import {
  CEILING,
  MASTER_DEFAULT_DB,
  clampMaster,
  dbToGain,
  gainToDb,
  limiterModel,
  softClip,
  softClipCurve,
} from '../../../src/audio/db';

describe('db', () => {
  it('converts known values', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(CEILING).toBeCloseTo(0.891, 3);
    expect(gainToDb(1)).toBe(0);
    expect(gainToDb(0)).toBe(-Infinity);
  });

  it('round trips', () => {
    for (const db of [-40, -12, -6, 0, 3]) expect(gainToDb(dbToGain(db))).toBeCloseTo(db, 9);
  });

  it('clamps the master level', () => {
    expect(clampMaster(-100)).toBe(-40);
    expect(clampMaster(5)).toBe(0);
    expect(clampMaster(-12)).toBe(-12);
    expect(clampMaster(Number.NaN)).toBe(MASTER_DEFAULT_DB);
  });

  it('has a clipper that ends at the ceiling and is nearly linear when quiet', () => {
    expect(softClip(1)).toBeCloseTo(CEILING, 12);
    expect(softClip(-1)).toBeCloseTo(-CEILING, 12);
    expect(softClip(5)).toBeCloseTo(CEILING, 12);
    expect(softClip(0.01)).toBeCloseTo(0.01, 4);
    const curve = softClipCurve(129);
    expect(curve).toHaveLength(129);
    expect(Math.max(...curve)).toBeLessThanOrEqual(CEILING + 1e-7);
  });

  it('never goes above the ceiling', () => {
    for (const p of [0, 0.1, 0.5, 1, 4, 100, Infinity]) {
      expect(limiterModel(p)).toBeLessThanOrEqual(CEILING);
    }
  });
});
