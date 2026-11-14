/**
 * Property predicates. Each takes the implementation under test, so the real property test passes the
 * real code and a mutant test passes a broken copy.
 */
import fc from 'fast-check';
import { createRng } from '../../../src/engine/index';
import type { CaptionEvent, CaptionMerger } from '../../../src/audio/captions';
import type { SoundSet } from '../../../src/audio/schema';
import { CHAPTERS, GLOBAL_EVENTS, TABLE, VOICES } from './tables';

export const CEILING = 10 ** (-1 / 20);

// ---- A1 variation
export type VaryFn = (
  rng: ReturnType<typeof createRng>,
  base: { freqHz: number; levelDb: number; filterHz: number },
) => { freqHz: number; levelDb: number; filterHz: number };

export function variationHolds(
  vary: VaryFn,
  seed: number,
  base: { freqHz: number; levelDb: number; filterHz: number },
): boolean {
  const a = vary(createRng(seed), base);
  const b = vary(createRng(seed), base);
  if (a.freqHz !== b.freqHz || a.levelDb !== b.levelDb || a.filterHz !== b.filterHz) return false;
  const cents = Math.abs(1200 * Math.log2(a.freqHz / base.freqHz));
  return (
    cents <= 50 + 1e-9 &&
    Math.abs(a.levelDb - base.levelDb) <= 2 + 1e-9 &&
    Math.abs(a.filterHz / base.filterHz - 1) <= 0.08 + 1e-9
  );
}

// ---- A2 mix
export function limiterCeilingHolds(limiter: (peak: number) => number, peaks: number[]): boolean {
  return peaks.every((p) => limiter(p) <= CEILING + 1e-12);
}

export function dbRoundTrips(
  toGain: (db: number) => number,
  toDb: (g: number) => number,
  db: number,
): boolean {
  return Math.abs(toDb(toGain(db)) - db) < 1e-9;
}

// ---- A3 captions
export interface TimedCaption {
  text: string;
  dt: number;
}

export function mergerHolds(
  createMerger: (clock: () => number) => CaptionMerger,
  sequence: TimedCaption[],
): boolean {
  let now = 0;
  const merger = createMerger(() => now);
  const lastEmitted = new Map<string, number>();
  for (const item of sequence) {
    now += item.dt;
    const event: CaptionEvent = { id: 'x', text: item.text, quiet: false };
    const out = merger.offer(event);
    const before = lastEmitted.get(item.text);
    if (out) {
      if (before !== undefined && now - before < 400) return false;
      lastEmitted.set(item.text, now);
    } else if (before === undefined || now - before >= 400) {
      return false; // dropped without a same-text emission inside 400 ms
    }
  }
  return true;
}

/** A caption rule is right when it accepts 1 to 6 words and rejects every other count. */
export function captionRuleAgrees(rule: (text: string) => boolean, words: number): boolean {
  const text = `[${Array.from({ length: words }, () => 'word').join(' ')}]`;
  return rule(text) === (words >= 1 && words <= 6);
}

// ---- A4 coverage and A5 set data
type Sets = Record<string, SoundSet>;

function sorted(items: readonly string[]): string {
  return [...items].sort().join('|');
}

export function checkCoverage(sets: Sets): string[] {
  const errors: string[] = [];
  for (const chapter of CHAPTERS) {
    const set = sets[chapter];
    const row = TABLE[chapter];
    if (!set) {
      errors.push(`${chapter}: missing set`);
      continue;
    }
    const ids = set.events.map((e) => e.id as string);
    if (sorted(ids) !== sorted([...GLOBAL_EVENTS, ...row.events])) {
      errors.push(`${chapter}: wrong event list ${sorted(ids)}`);
    }
    const captions: string[] = [];
    for (const e of set.events) {
      if (!e.caption) errors.push(`${chapter}: event ${e.id} has no caption`);
      captions.push(e.caption);
      for (const s of e.steps) {
        if (!(VOICES as readonly string[]).includes(s.voice)) {
          errors.push(`${chapter}: event ${e.id} names an unknown voice ${s.voice}`);
        }
      }
    }
    for (const b of set.beds) {
      if (!b.caption) errors.push(`${chapter}: bed ${b.id} has no caption`);
      captions.push(b.caption);
      if (!(VOICES as readonly string[]).includes(b.voice)) {
        errors.push(`${chapter}: bed ${b.id} names an unknown voice ${b.voice}`);
      }
    }
    if (new Set(captions).size !== captions.length) errors.push(`${chapter}: shared caption`);
    if (
      set.beds.map((b) => `${b.voice}:${b.loopSeconds}`).join() !==
      row.beds.map((b) => `${b.voice}:${b.loop}`).join()
    ) {
      errors.push(`${chapter}: beds differ from the table`);
    }
    const repair = set.events.find((e) => e.id === 'repair');
    if (!repair || repair.steps.map((s) => s.voice).join() !== row.repair.join()) {
      errors.push(`${chapter}: repair stinger differs from the table`);
    }
    if (sorted(set.needsSample) !== sorted(row.needsSample)) {
      errors.push(`${chapter}: needsSample differs from the table`);
    }
  }
  return errors;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcm(values: number[]): number {
  return values.reduce((acc, v) => (acc / gcd(acc, v)) * v, 1);
}

const STINGERS = ['repair', 'level-solved'];

export function checkSetData(sets: Sets): string[] {
  const errors: string[] = [];
  for (const chapter of CHAPTERS) {
    const set = sets[chapter];
    if (!set) {
      errors.push(`${chapter}: missing set`);
      continue;
    }
    if (set.room !== TABLE[chapter].room) errors.push(`${chapter}: room seconds differ`);
    if (set.beds.length < 2) errors.push(`${chapter}: fewer than two bed layers`);
    const loops = set.beds.map((b) => b.loopSeconds);
    if (new Set(loops).size !== loops.length) errors.push(`${chapter}: equal loop lengths`);
    if (loops.length > 0 && lcm(loops.map((l) => Math.round(l))) < 300) {
      errors.push(`${chapter}: loops repeat in under 300 s`);
    }
    for (const b of set.beds) {
      if (b.levelDb < -50 || b.levelDb > -24) errors.push(`${chapter}: bed ${b.id} level`);
      if (b.loopSeconds < 30 || b.loopSeconds > 120) errors.push(`${chapter}: bed ${b.id} loop`);
      if (b.fadeIn < 2 || b.fadeIn > 3 || b.fadeOut < 2 || b.fadeOut > 3) {
        errors.push(`${chapter}: bed ${b.id} fade`);
      }
    }
    for (const e of set.events) {
      const loudest = Math.max(...e.steps.map((s) => s.levelDb));
      const [lo, hi] =
        e.id === 'tab-tick' ? [-28, -24] : STINGERS.includes(e.id) ? [-10.5, -7.5] : [-14, -10];
      if (loudest < lo || loudest > hi) errors.push(`${chapter}: event ${e.id} level ${loudest}`);
    }
  }
  return errors;
}

// ---- A6 focus curve
export type FocusFn = (from: number, to: number, duration: number, t: number) => number;

export function focusCurveHolds(
  fn: FocusFn,
  from: number,
  to: number,
  duration: number,
  fractions: number[],
): boolean {
  if (fn(from, to, duration, 0) !== from) return false;
  if (fn(from, to, duration, duration) !== to) return false;
  const ts = [0, ...[...fractions].sort((a, b) => a - b).map((f) => f * duration), duration];
  let previous = from;
  for (const t of ts) {
    const f = fn(from, to, duration, t);
    if (f < 350 - 1e-9 || f > 9000 + 1e-9) return false;
    const slack = 1e-9 * Math.max(f, previous);
    if (to >= from ? f < previous - slack : f > previous + slack) return false;
    previous = f;
  }
  return true;
}

// ---- A7 loader plan
export type PlanFn = (
  chapter: string,
  enabled: boolean,
  sets: Record<string, SoundSet>,
  shared: readonly string[],
) => string[];

export function fixtureSet(samples: string[]): SoundSet {
  return {
    room: 1,
    beds: samples.map((s, i) => ({
      id: `bed${i}`,
      voice: 'wind' as const,
      levelDb: -33,
      loopSeconds: 47 + i,
      fadeIn: 2,
      fadeOut: 2,
      caption: '[wind blows]',
      sample: s,
    })),
    events: [],
    needsSample: [],
  };
}

export function loaderHolds(
  plan: PlanFn,
  chapter: string,
  enabled: boolean,
  own: Record<string, string[]>,
  shared: string[],
): boolean {
  const sets: Record<string, SoundSet> = {};
  for (const [name, samples] of Object.entries(own)) sets[name] = fixtureSet(samples);
  const out = plan(chapter, enabled, sets, shared);
  if (!enabled) return out.length === 0;
  const allowed = new Set([...(own[chapter] ?? []), ...shared]);
  return out.every((id) => allowed.has(id)) && [...allowed].every((id) => out.includes(id));
}

// ---- arbitraries
export const seedArb = fc.integer({ min: 0, max: 2 ** 31 - 1 });
export const baseArb = fc.record({
  freqHz: fc.double({ min: 20, max: 12000, noNaN: true }),
  levelDb: fc.double({ min: -60, max: 0, noNaN: true }),
  filterHz: fc.double({ min: 100, max: 12000, noNaN: true }),
});
export const captionSequenceArb = fc.array(
  fc.record({
    text: fc.constantFrom('[a]', '[b]', '[c]'),
    dt: fc.integer({ min: 0, max: 900 }),
  }),
  { maxLength: 40 },
);
/** Samples per chapter. Ids start with the chapter name so no two chapters share one. */
export const ownSamplesArb = fc
  .array(fc.integer({ min: 0, max: 3 }), { minLength: 3, maxLength: 3 })
  .map((counts) =>
    Object.fromEntries(
      ['one', 'two', 'three'].map((name, i) => [
        name,
        Array.from({ length: counts[i] ?? 0 }, (_, k) => `${name}-${k}`),
      ]),
    ),
  );
export const sharedArb = fc.array(fc.constantFrom('shared-a', 'shared-b'), { maxLength: 2 });
