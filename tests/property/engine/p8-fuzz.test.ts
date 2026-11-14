import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP8 } from './props/p8-fuzz';

describe('P8 Fuzz', () => {
  it('never throws and keeps every invariant', () => {
    fc.assert(propertyP8(engine), fcParams);
  });
});
