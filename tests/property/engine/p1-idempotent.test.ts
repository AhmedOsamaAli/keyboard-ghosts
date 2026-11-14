import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP1 } from './props/p1-idempotent';

describe('P1 Idempotent', () => {
  it('choosing the same repair twice gives the same canonical state as once', () => {
    fc.assert(propertyP1(engine), fcParams);
  });
});
