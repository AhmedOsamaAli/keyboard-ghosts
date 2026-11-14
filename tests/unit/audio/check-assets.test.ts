import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isValidCaption } from '../../../src/audio/captions';
import { loadAssetCheck } from '../../property/audio/assets-props';

interface Fixture {
  manifest: unknown;
  files: string[];
  proofs: string[];
  sampleIds: string[];
  expected: string[];
}

const dir = new URL('../../fixtures/audio/manifests/', import.meta.url);
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('check-assets fixtures', () => {
  it('has a valid fixture and one per broken rule', () => {
    expect(fixtures).toContain('valid.json');
    expect(fixtures.length).toBeGreaterThanOrEqual(8);
  });

  for (const name of fixtures) {
    it(`gives the expected messages for ${name}`, async () => {
      const check = await loadAssetCheck();
      const f = JSON.parse(readFileSync(new URL(name, dir), 'utf8')) as Fixture;
      const errors = check.validateManifest(f.manifest, {
        files: f.files,
        proofExists: (p) => f.proofs.includes(p),
        sampleIds: f.sampleIds,
      });
      expect(errors).toEqual(f.expected);
    });
  }

  it('fails a manifest that is not an object with an assets array', async () => {
    const check = await loadAssetCheck();
    const ctx = { files: [], proofExists: () => true, sampleIds: [] };
    expect(check.validateManifest({}, ctx)).toHaveLength(1);
    expect(check.validateManifest({ assets: [] }, ctx)).toEqual([]);
  });

  it('agrees with the engine caption rules', async () => {
    const check = await loadAssetCheck();
    const samples = [
      '[a heavy door thuds]',
      "[the ghost's breath thins]",
      '[a music-box note]',
      '[A door]',
      '[two 2 doors]',
      '[a door!]',
      '[]',
      'no brackets',
      '[one two three four five six]',
      '[one two three four five six seven]',
      '[  spaced   words  ]',
    ];
    for (const s of samples) {
      expect(check.captionRuleErrors(s).length === 0, s).toBe(isValidCaption(s));
    }
  });
});
