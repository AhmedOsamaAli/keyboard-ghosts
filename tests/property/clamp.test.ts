import { describe, it } from 'vitest';
import fc from 'fast-check';
import { clamp } from '../../src/engine/clamp';

describe('clamp (property)', () => {
  it('result is always between min and max', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (n, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const r = clamp(n, min, max);
          return r >= min && r <= max;
        },
      ),
    );
  });
});
