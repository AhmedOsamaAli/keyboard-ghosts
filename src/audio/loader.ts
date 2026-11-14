import type { SoundSet } from './schema';

/** Sample ids named by one set, once each and in order. */
export function samplesOf(set: SoundSet): string[] {
  const ids: string[] = [];
  for (const layer of set.beds) if (layer.sample) ids.push(layer.sample);
  for (const event of set.events) for (const s of event.steps) if (s.sample) ids.push(s.sample);
  return [...new Set(ids)];
}

/**
 * The samples to load: only the chapter's own and the shared ones. Nothing loads before `enable()`,
 * so the plan is empty when `enabled` is false.
 */
export function loaderPlan(
  chapter: string,
  enabled: boolean,
  sets: Readonly<Record<string, SoundSet>>,
  shared: readonly string[] = [],
): string[] {
  if (!enabled) return [];
  const set = sets[chapter];
  const own = set ? samplesOf(set) : [];
  return [...new Set([...own, ...shared])];
}

export interface FetchResponseLike {
  ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export type FetchLike = (url: string) => Promise<FetchResponseLike>;

/** Loads each planned sample with the `fetch` it is given. A failed sample is left out. */
export async function loadSamples(
  plan: readonly string[],
  fetchFn: FetchLike,
  urlOf: (id: string) => string,
): Promise<Map<string, ArrayBuffer>> {
  const out = new Map<string, ArrayBuffer>();
  for (const id of plan) {
    try {
      const res = await fetchFn(urlOf(id));
      if (res.ok) out.set(id, await res.arrayBuffer());
    } catch {
      // A missing sample is not an error: the code-made voice plays instead.
    }
  }
  return out;
}
