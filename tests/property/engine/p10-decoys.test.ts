import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP10 } from './props/p10-decoys';

describe('P10 Decoys never release', () => {
  it('a decoy never releases and always says why', () => {
    fc.assert(propertyP10(engine), fcParams);
  });
});
