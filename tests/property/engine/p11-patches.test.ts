import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP11 } from './props/p11-patches';

describe('P11 Patches mirror the picks', () => {
  it('activePatches holds exactly the picked repairs', () => {
    fc.assert(propertyP11(engine), fcParams);
  });
});
