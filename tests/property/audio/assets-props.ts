import fc from 'fast-check';

/** The parts of scripts/check-assets.mjs that the tests use. */
export interface ManifestContext {
  files: string[];
  proofExists(path: string): boolean;
  sampleIds: string[];
  licences?: string[];
}
export interface AssetCheck {
  validateManifest(manifest: unknown, ctx: ManifestContext): string[];
  captionRuleErrors(text: string): string[];
  LICENCES: string[];
}

/** Loads the Node script. It runs its checks only when it is started as a script. */
export async function loadAssetCheck(): Promise<AssetCheck> {
  const url = new URL('../../../scripts/check-assets.mjs', import.meta.url).href;
  return (await import(/* @vite-ignore */ url)) as AssetCheck;
}

export interface Entry {
  path: string;
  source: string;
  author: string;
  licence: string;
  proof: string;
  caption: string;
}

const CHAPTERS = ['porch', 'foyer', 'chapel', 'gallery', 'library', 'attic', 'finale'];
const word = fc.stringMatching(/^[a-z]{2,8}$/);

export const entryArb: fc.Arbitrary<Entry> = fc
  .record({
    chapter: fc.constantFrom(...CHAPTERS),
    need: word,
    short: word,
    ext: fc.constantFrom('mp3', 'ogg', 'wav'),
    licence: fc.constantFrom('CC0', 'public-domain', 'original-code'),
    words: fc.array(word, { minLength: 1, maxLength: 6 }),
  })
  .map((r) => ({
    path: `assets/sounds/${r.chapter}/${r.need}-${r.short}.${r.ext}`,
    source: `https://example.org/${r.need}`,
    author: 'A fictional recordist',
    licence: r.licence,
    proof: `assets/licences/${r.need}-${r.short}.txt`,
    caption: `[${r.words.join(' ')}]`,
  }));

export interface Breakage {
  name: string;
  /** The start of the message the check must give. */
  message: string;
  apply(entry: Entry, ctx: ManifestContext): { entries: Entry[]; ctx: ManifestContext };
}

const same = (entry: Entry, ctx: ManifestContext) => ({ entries: [entry], ctx });

/** Each way to break a valid entry in exactly one rule, with the message it must give. */
export const BREAKAGES: Breakage[] = [
  {
    name: 'licence CC-BY',
    message: 'licence must be',
    apply: (e, c) => same({ ...e, licence: 'CC-BY' }, c),
  },
  {
    name: 'licence CC-BY-NC',
    message: 'licence must be',
    apply: (e, c) => same({ ...e, licence: 'CC-BY-NC' }, c),
  },
  {
    name: 'proof file missing',
    message: 'proof file missing',
    apply: (e, c) => same(e, { ...c, proofExists: () => false }),
  },
  {
    name: 'caption with capitals',
    message: 'caption breaks',
    apply: (e, c) => same({ ...e, caption: e.caption.toUpperCase() }, c),
  },
  {
    name: 'caption with 7 words',
    message: 'caption breaks',
    apply: (e, c) => same({ ...e, caption: '[a b c d e f g]' }, c),
  },
  {
    name: 'entry without a file',
    message: 'manifest entry without a file',
    apply: (e, c) => same(e, { ...c, files: [] }),
  },
  {
    name: 'file without an entry',
    message: 'no manifest entry for',
    apply: (e, c) => same(e, { ...c, files: [...c.files, 'assets/sounds/porch/extra-file.mp3'] }),
  },
  {
    name: 'unknown sample id',
    message: 'a sound set names a sample',
    apply: (e, c) =>
      same(e, { ...c, sampleIds: [...c.sampleIds, 'assets/sounds/attic/none-here.mp3'] }),
  },
  {
    name: 'path outside the rule',
    message: 'path must be',
    apply: (e, c) => {
      const path = e.path.replace('assets/sounds/', 'assets/sound/');
      return { entries: [{ ...e, path }], ctx: { ...c, files: [path], sampleIds: [] } };
    },
  },
  {
    name: 'missing author',
    message: 'missing field author',
    apply: (e, c) => same({ ...e, author: '' }, c),
  },
];

export function validContext(entry: Entry): ManifestContext {
  return { files: [entry.path], proofExists: (p) => p === entry.proof, sampleIds: [entry.path] };
}

/** A valid manifest passes, and each breakage fails with exactly its message. */
export function assetRulesHold(
  check: AssetCheck['validateManifest'],
  entry: Entry,
  breakage: Breakage,
): boolean {
  if (check({ assets: [entry] }, validContext(entry)).length !== 0) return false;
  const broken = breakage.apply(entry, validContext(entry));
  const errors = check({ assets: broken.entries }, broken.ctx);
  return errors.length === 1 && (errors[0] ?? '').startsWith(breakage.message);
}
