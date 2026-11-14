import { CHAPTER_IDS } from '../../engine/index';
import { soundSetSchema, type SoundSet } from '../schema';
import porch from './porch.json';
import foyer from './foyer.json';
import chapel from './chapel.json';
import gallery from './gallery.json';
import library from './library.json';
import attic from './attic.json';
import finale from './finale.json';

export type ChapterKey = (typeof CHAPTER_IDS)[number];

const raw: Record<ChapterKey, unknown> = { porch, foyer, chapel, gallery, library, attic, finale };

/** Every sound set, parsed with its schema. Importing this file throws if a set is broken. */
export const SOUND_SETS: Readonly<Record<ChapterKey, SoundSet>> = Object.fromEntries(
  CHAPTER_IDS.map((id) => [id, soundSetSchema.parse(raw[id])]),
) as Record<ChapterKey, SoundSet>;

export function getSet(chapter: ChapterKey): SoundSet {
  return SOUND_SETS[chapter];
}
