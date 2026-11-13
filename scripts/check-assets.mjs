// Fails if any file under assets/ has no entry in assets/manifest.json.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, basename, sep } from 'node:path';

const root = 'assets';
const manifestPath = join(root, 'manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error(`check-assets: cannot read ${manifestPath}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(manifest.assets)) {
  console.error(`check-assets: ${manifestPath} must contain an "assets" array.`);
  process.exit(1);
}

const listed = new Set(
  manifest.assets.map((a) => String(typeof a === 'string' ? a : (a.path ?? a.file ?? '')).replaceAll('\\', '/')),
);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const missing = walk(root)
  .map((p) => relative(root, p))
  .filter((rel) => {
    const name = basename(rel);
    if (rel === 'manifest.json' || name === 'README.md' || name === '.gitkeep') return false;
    if (rel.split(sep)[0] === 'licences') return false;
    return true;
  })
  .map((rel) => rel.split(sep).join('/'))
  .filter((rel) => !listed.has(rel) && !listed.has(`assets/${rel}`));

if (missing.length > 0) {
  console.error('check-assets: these files under assets/ have no entry in assets/manifest.json:');
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}
console.log('check-assets: ok');
