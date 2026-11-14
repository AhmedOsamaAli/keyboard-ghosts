import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import type { Rollup } from 'vite';

const entry = fileURLToPath(new URL('../../fixtures/audio/build-entry.ts', import.meta.url));
const root = fileURLToPath(new URL('../../..', import.meta.url));

/** Markers that must never be in a production build: the lab, the tuning drawer and test hooks. */
const MARKERS = [
  'labs/sound',
  'tune=1',
  'Copy sound JSON',
  'kg-sound-tune',
  '__sound',
  'Sound lab',
];

async function bundleText(): Promise<string> {
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: entry },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
  return outputs
    .flatMap((o) => o.output)
    .map((chunk) => ('code' in chunk ? chunk.code : String(chunk.source)))
    .join('\n');
}

describe('production build', () => {
  it('has no trace of the lab, the tuning drawer or a test hook', async () => {
    const text = await bundleText();
    expect(text).toContain('a wooden tap clicks');
    expect(text).toContain('createAudio');
    for (const marker of MARKERS) expect(text, marker).not.toContain(marker);
  }, 60000);
});
