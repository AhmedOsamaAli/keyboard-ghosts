import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP4 } from './props/p4-sufficient';

describe('P4 Sufficient', () => {
  it('every correct repair, in any order with decoys first, solves the level', () => {
    fc.assert(propertyP4(engine), fcParams);
  });
});
