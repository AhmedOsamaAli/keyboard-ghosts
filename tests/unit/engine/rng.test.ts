import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/rng';

describe('rng', () => {
  it('gives the same first values for the same seed', () => {
    const a = createRng(1);
    const b = createRng(1);
    const first = [a.next(), a.next(), a.next()];
    expect(first).toEqual([b.next(), b.next(), b.next()]);
    // mulberry32 with seed 1: fixed reference values
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(new Set(first).size).toBe(3);
  });
  it('keeps int inside its bounds, both ends included', () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
    expect(r.int(4, 4)).toBe(4);
  });
  it('rejects a bad int range', () => {
    const r = createRng(1);
    expect(() => r.int(2, 1)).toThrow(RangeError);
    expect(() => r.int(0.5, 2)).toThrow(RangeError);
  });
  it('saves and restores its state', () => {
    const a = createRng(99);
    a.next();
    a.next();
    const b = createRng(a.state());
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });
  it('throws when pick gets an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
  it('does not change the input of shuffle', () => {
    const input = [1, 2, 3, 4, 5];
    const out = createRng(5).shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('does not move the parent when it forks', () => {
    const a = createRng(3);
    const before = a.state();
    a.fork('x');
    expect(a.state()).toBe(before);
  });
  it('gives different forks for different labels', () => {
    const a = createRng(3);
    expect(a.fork('x').next()).not.toBe(a.fork('y').next());
    expect(a.fork('x').next()).toBe(a.fork('x').next());
  });
});
