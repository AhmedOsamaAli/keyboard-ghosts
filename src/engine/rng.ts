/** Seeded random numbers (mulberry32). The whole state is one 32-bit number. */
export interface Rng {
  /** A number in [0, 1). */
  next(): number;
  /** An integer in [min, max], both ends included. */
  int(min: number, max: number): number;
  /** One member of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy of the list. The input is not changed. */
  shuffle<T>(items: readonly T[]): T[];
  /** A new generator that depends on the current state and the label. The parent does not move. */
  fork(label: string): Rng;
  /** The serialisable state. `createRng(rng.state())` continues the same sequence. */
  state(): number;
}

function toUint32(n: number): number {
  return n >>> 0;
}

/** FNV-1a hash of a string, mixed with a 32-bit number. */
function hashLabel(label: string, seed: number): number {
  let h = toUint32(2166136261 ^ seed);
  for (let i = 0; i < label.length; i++) {
    h = toUint32(h ^ label.charCodeAt(i));
    h = toUint32(Math.imul(h, 16777619));
  }
  return h;
}

export function createRng(seed: number): Rng {
  let s = toUint32(seed);

  const next = (): number => {
    s = toUint32(s + 0x6d2b79f5);
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return toUint32(t ^ (t >>> 14)) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`int needs integers with min <= max, got ${min} and ${max}`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('pick needs a non-empty list');
    return items[int(0, items.length - 1)] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const a = out[i] as T;
      out[i] = out[j] as T;
      out[j] = a;
    }
    return out;
  };

  const fork = (label: string): Rng => createRng(hashLabel(label, s));

  return { next, int, pick, shuffle, fork, state: () => s };
}
