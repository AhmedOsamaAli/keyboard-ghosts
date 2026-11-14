import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP2 } from './props/p2-commutes';

describe('P2 Commutes across ghosts', () => {
  it('actions on different ghosts can be reordered', () => {
    fc.assert(propertyP2(engine), fcParams);
  });
});
