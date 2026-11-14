import fc from 'fast-check';
import { describe, it } from 'vitest';
import { engine } from '../../../src/engine/engine';
import { fcParams } from '../fc-config';
import { propertyP5 } from './props/p5-undo';

describe('P5 Undo restores', () => {
  it('undo returns the previous canonical state after a repair or a reset', () => {
    fc.assert(propertyP5(engine), fcParams);
  });
});
