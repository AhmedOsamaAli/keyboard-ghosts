import type { VoiceId } from '../schema';
import type { Settings } from './params';

const PITCH =
  /^(fundamentalHz|rootHz|thudHz|toneHz|clankHz\d|thumpHz\d|pitchLowHz|pitchHighHz|sineFromHz|sineToHz)$/;
const FILTER =
  /^(bandHz|lowHz|highHz|lowpassHz|highpassHz|formant(Low|High)Hz|centre(Low|High)Hz|scrape(From|To)Hz|partial(Low|High)Hz|whistleHz\d)$/;

/** Which numbers of a voice are its pitch and which are its filter. */
export function keyKind(voice: VoiceId, key: string): 'pitch' | 'filter' | null {
  if (voice === 'drip' && (key === 'fromHz' || key === 'toHz')) return 'pitch';
  if (voice === 'whoosh' && (key === 'fromHz' || key === 'toHz')) return 'filter';
  if (PITCH.test(key)) return 'pitch';
  if (FILTER.test(key)) return 'filter';
  return null;
}

/** Scales the pitch numbers by `pitchRatio` and the filter numbers by `filterFactor`. */
export function applyVariation(
  voice: VoiceId,
  settings: Settings,
  pitchRatio: number,
  filterFactor: number,
): Settings {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(settings)) {
    const kind = keyKind(voice, key);
    out[key] =
      kind === 'pitch' ? value * pitchRatio : kind === 'filter' ? value * filterFactor : value;
  }
  return out;
}
