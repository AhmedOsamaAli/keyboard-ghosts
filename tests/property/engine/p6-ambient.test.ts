import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP6 } from './props/p6-ambient';

describe('P6 Ambient is bounded and monotone', () => {
  it('stays in range, hits both ends and never falls when a ghost is released', () => {
    fc.assert(propertyP6(engine), fcParams);
  });
});
