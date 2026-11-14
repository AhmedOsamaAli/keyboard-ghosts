import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP3 } from './props/p3-necessary';

describe('P3 Every ghost is necessary', () => {
  it('leaving out any correct repair leaves the level unsolved', () => {
    fc.assert(propertyP3(engine), fcParams);
  });
});
