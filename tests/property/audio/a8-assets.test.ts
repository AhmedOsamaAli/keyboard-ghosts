import { describe, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { BREAKAGES, assetRulesHold, entryArb, loadAssetCheck } from './assets-props';

describe('A8 asset rules', () => {
  it('passes a valid manifest and fails each single broken rule with its message', async () => {
    const check = await loadAssetCheck();
    fc.assert(
      fc.property(entryArb, fc.constantFrom(...BREAKAGES), (entry, breakage) =>
        assetRulesHold(check.validateManifest, entry, breakage),
      ),
      fcParams,
    );
  });
});
