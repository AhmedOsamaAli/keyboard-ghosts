// The asset check. `npm run check` runs it. It fails when:
// - a file under assets/ has no entry in assets/manifest.json (licences/, README.md and .gitkeep are skipped)
// - a manifest entry has no file, a missing field, a path outside
//   assets/sounds/<chapter>/<need>-<short-name>.<ext>, a licence other than CC0, public-domain or
//   original-code, no proof file under assets/licences/, or a caption that breaks the caption rules
// - a sound set in src/audio/sets/ names a sample that is not in the manifest (a sample id is the
//   entry's path)
// The caption rules are a copy of src/audio/captions.ts. A unit test checks the two agree.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LICENCES = ['CC0', 'public-domain', 'original-code'];
export const CHAPTERS = ['porch', 'foyer', 'chapel', 'gallery', 'library', 'attic', 'finale'];
export const FIELDS = ['path', 'source', 'author', 'licence', 'proof', 'caption'];
const PATH_RULE = new RegExp(
  `^assets/sounds/(${CHAPTERS.join('|')})/[a-z0-9]+-[a-z0-9-]+\\.[a-z0-9]+$`,
);

/** The broken caption rules. An empty list means the caption is valid. */
export function captionRuleErrors(text) {
  const errors = [];
  if (typeof text !== 'string' || !text.startsWith('[') || !text.endsWith(']') || text.length < 2) {
    return ['caption must start with [ and end with ]'];
  }
  const inner = text.slice(1, -1);
  if (inner !== inner.toLowerCase()) errors.push('caption must be lower case');
  const words = inner.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 1 || words.length > 6) errors.push('caption must have 1 to 6 words');
  if (/\d/.test(inner)) errors.push('caption must not contain digits');
  if (/[^\p{L}\d\s'-]/u.test(inner)) {
    errors.push('caption must not contain punctuation other than hyphens and apostrophes');
  }
  return errors;
}

/**
 * Checks a manifest against the files that exist.
 * ctx: { files: string[] (paths from the repo root, under assets/), proofExists(path): boolean,
 *        sampleIds: string[], licences?: string[] }
 * Returns a list of messages. An empty list means the manifest is valid.
 */
export function validateManifest(manifest, ctx) {
  const licences = ctx.licences ?? LICENCES;
  if (!manifest || !Array.isArray(manifest.assets)) {
    return ['assets/manifest.json must contain an "assets" array'];
  }
  const errors = [];
  const listed = new Set();
  for (const entry of manifest.assets) {
    const path = typeof entry?.path === 'string' ? entry.path.replaceAll('\\', '/') : '';
    const missing = FIELDS.filter((f) => typeof entry?.[f] !== 'string' || entry[f].length === 0);
    if (missing.length > 0) {
      errors.push(`missing field ${missing.join(', ')}: ${path || '(no path)'}`);
      if (!path) continue;
    }
    listed.add(path);
    if (!PATH_RULE.test(path)) {
      errors.push(`path must be assets/sounds/<chapter>/<need>-<short-name>.<ext>: ${path}`);
    }
    if (!ctx.files.includes(path)) errors.push(`manifest entry without a file: ${path}`);
    if (typeof entry.licence === 'string' && !licences.includes(entry.licence)) {
      errors.push(`licence must be CC0, public-domain or original-code: ${path}`);
    }
    const proof = typeof entry.proof === 'string' ? entry.proof.replaceAll('\\', '/') : '';
    if (proof && (!proof.startsWith('assets/licences/') || !ctx.proofExists(proof))) {
      errors.push(`proof file missing under assets/licences/: ${path}`);
    }
    if (typeof entry.caption === 'string' && captionRuleErrors(entry.caption).length > 0) {
      errors.push(`caption breaks the caption rules: ${path}`);
    }
  }
  for (const file of ctx.files) {
    if (!listed.has(file)) errors.push(`no manifest entry for ${file}`);
  }
  for (const id of ctx.sampleIds) {
    if (!listed.has(id))
      errors.push(`a sound set names a sample that is not in the manifest: ${id}`);
  }
  return errors;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Every sample id that a sound set names. */
export function sampleIdsOf(set) {
  const ids = [];
  for (const layer of set.beds ?? []) if (layer.sample) ids.push(layer.sample);
  for (const event of set.events ?? []) {
    for (const step of event.steps ?? []) if (step.sample) ids.push(step.sample);
  }
  return ids;
}

function main() {
  const root = 'assets';
  const manifestPath = join(root, 'manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`check-assets: cannot read ${manifestPath}: ${err.message}`);
    process.exit(1);
  }
  const files = walk(root)
    .map((p) => relative(root, p))
    .filter((rel) => {
      const name = basename(rel);
      if (rel === 'manifest.json' || name === 'README.md' || name === '.gitkeep') return false;
      return rel.split(sep)[0] !== 'licences';
    })
    .map((rel) => `assets/${rel.split(sep).join('/')}`);
  const setsDir = join('src', 'audio', 'sets');
  const sampleIds = existsSync(setsDir)
    ? readdirSync(setsDir)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => sampleIdsOf(JSON.parse(readFileSync(join(setsDir, f), 'utf8'))))
    : [];
  const errors = validateManifest(manifest, { files, proofExists: existsSync, sampleIds });
  if (errors.length > 0) {
    console.error('check-assets: the asset rules are broken:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('check-assets: ok');
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) main();
