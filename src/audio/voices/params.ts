import { z } from 'zod';
import { VOICE_IDS, type VoiceId } from '../schema';
import defaultsFile from './defaults.json';

const numbered = (prefix: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

const CALIBRATION = ['trimDb', 'rmsDb'];
const CREAK = [
  'pitchLowHz',
  'pitchHighHz',
  'bandQ',
  'bandRatio',
  'slipHz',
  'slipDepth',
  'durationS',
  'wanderRate',
];
const TEMPLATE = (fundamental: string[], n: number): string[] => [
  ...fundamental,
  ...numbered('ratio', n),
  ...numbered('level', n),
];

/** The numbers each voice reads. Every voice also has `trimDb` and `rmsDb` (calibration). */
const OWN_KEYS: Record<VoiceId, string[]> = {
  tap: [
    'burstMs',
    'bandHz',
    'bandQ',
    'noiseLevel',
    'sineFromHz',
    'sineToHz',
    'sineMs',
    'sineLevel',
  ],
  chime: TEMPLATE(['fundamentalHz', 'tailS', 'fadeExponent'], 4),
  'glass-ring': TEMPLATE(['fundamentalHz', 'tailS', 'fadeExponent'], 5),
  'clock-chime': TEMPLATE(['fundamentalHz', 'tailS', 'fadeExponent'], 5),
  'church-bell': TEMPLATE(['fundamentalHz', 'tailS', 'fadeExponent'], 8),
  'clock-tick': ['clickMs', 'highpassHz', 'dropCents', 'periodS', 'level', 'tockLevel'],
  breath: ['lowHz', 'highHz', 'swellS', 'thinS', 'toneHz', 'toneLevel', 'tailS'],
  whoosh: ['fromHz', 'toHz', 'sweepS', 'q', 'durationS'],
  wind: ['centreLowHz', 'centreHighHz', 'driftHz', 'q', 'levelDrift', 'levelDriftHz', 'durationS'],
  'wind-gaps': [
    'centreLowHz',
    'centreHighHz',
    'driftHz',
    'q',
    'levelDrift',
    'levelDriftHz',
    'whistleHz1',
    'whistleHz2',
    'whistleQ',
    'whistleLevel',
    'durationS',
  ],
  'room-tone': ['lowpassHz', 'durationS'],
  fire: ['rumbleHz', 'rumbleLevel', 'crackleRate', 'crackleLevel', 'durationS'],
  'rain-roof': ['lowHz', 'highHz', 'durationS'],
  thunder: ['lowHz', 'highHz', 'attackS', 'decayS'],
  'floor-creak': CREAK,
  'door-creak': CREAK,
  'big-door': ['thudHz', 'thudS', 'creakDelayS', 'creakLevel', ...CREAK],
  chains: [
    'burstCount',
    'spacingMinS',
    'spacingMaxS',
    'partialLowHz',
    'partialHighHz',
    'partialDecayS',
    'partialsPerBurst',
  ],
  bars: [
    'scrapeFromHz',
    'scrapeToHz',
    'scrapeS',
    'scrapeQ',
    'scrapeLevel',
    'clankHz1',
    'clankHz2',
    'clankS',
    'clankLevel',
  ],
  chord: ['rootHz', 'attackS', 'tailS', 'rise', 'triangleLevel', 'octaveLevel'],
  murmur: [
    'formantLowHz',
    'formantHighHz',
    'formantQ',
    'swellHz',
    'swellDepth',
    'driftHz',
    'durationS',
  ],
  drip: ['fromHz', 'toHz', 'riseMs', 'decayMs', 'tailLevel', 'tailS'],
  'music-box': [...TEMPLATE(['fundamentalHz'], 3), ...numbered('decay', 3)],
  drone: [
    'rootHz',
    'detuneCents',
    'lowpassHz',
    'lowpassDepth',
    'lowpassDriftHz',
    'riseCents',
    'attackS',
    'releaseS',
    'durationS',
  ],
  riser: ['noiseLevel', 'sineFromHz', 'sineToHz', 'riseS', 'durationS'],
  heartbeat: ['thumpHz1', 'thumpHz2', 'gapS', 'periodS', 'count', 'thumpDecayS'],
};

export const VOICE_KEYS: Record<VoiceId, readonly string[]> = Object.fromEntries(
  VOICE_IDS.map((v) => [v, [...CALIBRATION, ...OWN_KEYS[v]]]),
) as unknown as Record<VoiceId, readonly string[]>;

export type Settings = Readonly<Record<string, number>>;

const defaultsSchema = z.record(z.string(), z.record(z.string(), z.number().finite()));

/** The default numbers for every voice. Throws when the file is incomplete or has unknown keys. */
export function parseDefaults(data: unknown): Record<VoiceId, Settings> {
  const parsed = defaultsSchema.parse(data);
  const out: Partial<Record<VoiceId, Settings>> = {};
  for (const id of VOICE_IDS) {
    const entry = parsed[id];
    if (!entry) throw new Error(`voice defaults: missing voice ${id}`);
    const wanted = [...VOICE_KEYS[id]].sort();
    const found = Object.keys(entry).sort();
    if (wanted.join() !== found.join()) {
      throw new Error(`voice defaults: ${id} has the wrong keys (${found.join(', ')})`);
    }
    out[id] = entry;
  }
  for (const key of Object.keys(parsed)) {
    if (!(VOICE_IDS as readonly string[]).includes(key)) {
      throw new Error(`voice defaults: unknown voice ${key}`);
    }
  }
  return out as Record<VoiceId, Settings>;
}

export const VOICE_DEFAULTS: Record<VoiceId, Settings> = parseDefaults(defaultsFile);

/** Defaults merged with a tuning map and with a step's own overrides (later wins). */
export function settingsFor(
  voice: VoiceId,
  overrides?: Readonly<Record<string, number>>,
  tuning?: Readonly<Partial<Record<VoiceId, Readonly<Record<string, number>>>>>,
): Settings {
  const merged = { ...VOICE_DEFAULTS[voice], ...(tuning?.[voice] ?? {}), ...(overrides ?? {}) };
  for (const key of Object.keys(merged)) {
    if (!VOICE_KEYS[voice].includes(key)) {
      throw new Error(`voice ${voice} has no setting named ${key}`);
    }
  }
  return merged;
}
