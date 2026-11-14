/** Deliberate bugs. Each must make the matching property fail. The tenth mutant is in mutants-assets.test.ts. */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { captionErrors, createCaptionMerger, isValidCaption } from '../../../src/audio/captions';
import { focusFrequency } from '../../../src/audio/focus-curve';
import { loaderPlan, samplesOf } from '../../../src/audio/loader';
import { limiterModel } from '../../../src/audio/db';
import { SOUND_SETS } from '../../../src/audio/sets/index';
import type { SoundSet } from '../../../src/audio/schema';
import { percentToCents, vary } from '../../../src/audio/variation';
import { CHAPTERS } from './tables';
import {
  baseArb,
  captionRuleAgrees,
  captionSequenceArb,
  checkSetData,
  focusCurveHolds,
  limiterCeilingHolds,
  loaderHolds,
  mergerHolds,
  ownSamplesArb,
  seedArb,
  sharedArb,
  variationHolds,
} from './props';

function propertyFails<T>(property: fc.IProperty<T>): boolean {
  return fc.check(property, fcParams).failed;
}

function cloneSets(): Record<string, SoundSet> {
  return structuredClone(SOUND_SETS) as Record<string, SoundSet>;
}

/** The set-data property A5, run on sets that a mutation has changed. */
function setDataFails(mutate: (sets: Record<string, SoundSet>, chapter: string) => void): boolean {
  return propertyFails(
    fc.property(fc.constantFrom(...CHAPTERS), (chapter) => {
      const sets = cloneSets();
      mutate(sets, chapter);
      return checkSetData(sets).every((e) => !e.startsWith(chapter));
    }),
  );
}

describe('mutants', () => {
  it('1: a limiter ceiling of 0 dBFS fails A2', () => {
    const mutant = (p: number) => Math.min(1, p);
    expect(
      propertyFails(
        fc.property(fc.array(fc.double({ min: 0, max: 1e6, noNaN: true }), { minLength: 1 }), (p) =>
          limiterCeilingHolds(mutant, p),
        ),
      ),
    ).toBe(true);
    expect(limiterCeilingHolds(limiterModel, [1, 1e6])).toBe(true);
  });

  it('2: a merger that drops a distinct caption fails A3', () => {
    const mutant = (clock: () => number) => {
      const real = createCaptionMerger(clock);
      let lastAny = -Infinity;
      return {
        offer(event: Parameters<typeof real.offer>[0]) {
          if (clock() - lastAny < 400) return null;
          lastAny = clock();
          return real.offer(event);
        },
      };
    };
    expect(propertyFails(fc.property(captionSequenceArb, (seq) => mergerHolds(mutant, seq)))).toBe(
      true,
    );
  });

  it('3: a variation that allows 6% fails A1', () => {
    const limits = { pitchCents: percentToCents(6), levelDb: 2, filter: 0.08 };
    expect(
      propertyFails(
        fc.property(seedArb, baseArb, (seed, base) =>
          variationHolds((rng, b) => vary(rng, b, limits), seed, base),
        ),
      ),
    ).toBe(true);
  });

  it('4: a focus curve that overshoots below 350 Hz fails A6', () => {
    const mutant = (from: number, to: number, d: number, t: number) => {
      const f = focusFrequency(from, to, d, t);
      const u = Math.min(1, Math.max(0, t / d));
      return f * (1 - 0.2 * Math.sin(Math.PI * u));
    };
    expect(
      propertyFails(
        fc.property(
          fc.constantFrom(9000, 350),
          fc.constantFrom(350, 9000),
          fc.array(fc.double({ min: 0.05, max: 0.95, noNaN: true }), {
            minLength: 1,
            maxLength: 5,
          }),
          (from, to, fr) => focusCurveHolds(mutant, from, to, 1, fr),
        ),
      ),
    ).toBe(true);
  });

  it('5: a loader that loads every chapter fails A7', () => {
    const mutant = (
      _chapter: string,
      enabled: boolean,
      sets: Record<string, SoundSet>,
      shared: readonly string[],
    ) => (enabled ? [...Object.values(sets).flatMap(samplesOf), ...shared] : []);
    expect(
      propertyFails(
        fc.property(
          ownSamplesArb,
          sharedArb,
          fc.constantFrom('one', 'two', 'three'),
          (own, shared, chapter) => loaderHolds(mutant, chapter, true, own, shared),
        ),
      ),
    ).toBe(true);
    expect(loaderHolds(loaderPlan, 'one', true, { one: ['one-0'], two: ['two-0'] }, [])).toBe(true);
  });

  it('6: a caption rule that allows 8 words fails A3', () => {
    const mutant = (text: string) => {
      const words = text.slice(1, -1).split(/\s+/).filter(Boolean).length;
      const rest = captionErrors(text).filter((e) => !e.includes('words'));
      return rest.length === 0 && words >= 1 && words <= 8;
    };
    expect(
      propertyFails(
        fc.property(fc.integer({ min: 0, max: 14 }), (n) => captionRuleAgrees(mutant, n)),
      ),
    ).toBe(true);
    expect(captionRuleAgrees(isValidCaption, 7)).toBe(true);
  });

  it('7: a bed set with two equal loop lengths fails A5', () => {
    expect(
      setDataFails((sets, chapter) => {
        const beds = sets[chapter]?.beds;
        if (beds && beds[0] && beds[1]) beds[1].loopSeconds = beds[0].loopSeconds;
      }),
    ).toBe(true);
  });

  it('8: a chapter set with a single bed layer fails A5', () => {
    expect(
      setDataFails((sets, chapter) => {
        const set = sets[chapter];
        if (set) set.beds = set.beds.slice(0, 1);
      }),
    ).toBe(true);
  });

  it('9: a one-shot 10 dB too loud fails A5', () => {
    expect(
      setDataFails((sets, chapter) => {
        const event = sets[chapter]?.events.find((e) => e.id === 'ghost-breath');
        for (const s of event?.steps ?? []) s.levelDb += 10;
      }),
    ).toBe(true);
  });
});
