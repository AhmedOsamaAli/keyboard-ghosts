/** The tenth mutant: a manifest check that accepts CC-BY must fail A8. */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fcParams } from '../fc-config';
import { BREAKAGES, assetRulesHold, entryArb, loadAssetCheck } from './assets-props';

describe('mutants (asset check)', () => {
  it('10: a manifest check that accepts CC-BY fails A8', async () => {
    const check = await loadAssetCheck();
    const mutant: typeof check.validateManifest = (manifest, ctx) =>
      check.validateManifest(manifest, { ...ctx, licences: [...check.LICENCES, 'CC-BY'] });
    const result = fc.check(
      fc.property(entryArb, fc.constantFrom(...BREAKAGES), (entry, breakage) =>
        assetRulesHold(mutant, entry, breakage),
      ),
      fcParams,
    );
    expect(result.failed).toBe(true);
  });
});
