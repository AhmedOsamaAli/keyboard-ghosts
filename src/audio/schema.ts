import { z } from 'zod';
import { CHAPTER_IDS } from '../engine/index';

/** Every code-made voice. `room` is a generated impulse, not a voice. */
export const VOICE_IDS = [
  'tap',
  'chime',
  'glass-ring',
  'clock-chime',
  'church-bell',
  'clock-tick',
  'breath',
  'whoosh',
  'wind',
  'wind-gaps',
  'room-tone',
  'fire',
  'rain-roof',
  'thunder',
  'floor-creak',
  'door-creak',
  'big-door',
  'chains',
  'bars',
  'chord',
  'murmur',
  'drip',
  'music-box',
  'drone',
  'riser',
  'heartbeat',
] as const;
export const voiceIdSchema = z.enum(VOICE_IDS);
export type VoiceId = z.infer<typeof voiceIdSchema>;

export const GLOBAL_EVENT_IDS = [
  'tab-tick',
  'light-dies',
  'repair',
  'ghost-breath',
  'ghost-release',
  'chapter-card',
  'level-solved',
] as const;

export const CHAPTER_EVENT_IDS = [
  'clock-chime',
  'floor-creak',
  'door-creak',
  'church-bell',
  'bars',
  'chains',
  'big-door',
  'drip',
  'heartbeat',
  'thunder',
  'riser',
] as const;

export const EVENT_IDS = [...GLOBAL_EVENT_IDS, ...CHAPTER_EVENT_IDS] as const;
export const eventIdSchema = z.enum(EVENT_IDS);
export type EventId = z.infer<typeof eventIdSchema>;

export const busSchema = z.enum(['world', 'stinger']);
export type Bus = z.infer<typeof busSchema>;

/** Ranges that the sound-set data must stay inside (design.md, Decisions 4). */
export const RANGES = {
  bedLevelDb: { min: -50, max: -24 },
  oneShotLevelDb: { min: -30, max: -9 },
  tabTickLevelDb: { min: -30, max: -22 },
  loopSeconds: { min: 30, max: 120 },
  fadeSeconds: { min: 2, max: 3 },
  room: { min: 0.3, max: 4 },
} as const;

const caption = z.string().min(3);
const params = z.record(z.string(), z.number().finite()).optional();
const sample = z.string().min(1).nullable();

export const stepSchema = z.object({
  voice: voiceIdSchema,
  bus: busSchema,
  levelDb: z.number().finite().min(-60).max(0),
  /** Delay from the start of the event, in seconds. */
  at: z.number().min(0).max(10),
  params,
  sample,
});
export type Step = z.infer<typeof stepSchema>;

export const eventSchema = z.object({
  id: eventIdSchema,
  caption,
  steps: z.array(stepSchema).min(1),
});
export type SoundEvent = z.infer<typeof eventSchema>;

export const bedLayerSchema = z.object({
  id: z.string().min(1),
  voice: voiceIdSchema,
  levelDb: z.number().finite(),
  loopSeconds: z.number().positive(),
  fadeIn: z.number().positive(),
  fadeOut: z.number().positive(),
  caption,
  params,
  sample,
});
export type BedLayer = z.infer<typeof bedLayerSchema>;

export const soundSetSchema = z.object({
  room: z.number().positive(),
  beds: z.array(bedLayerSchema),
  events: z.array(eventSchema),
  needsSample: z.array(z.string().min(1)),
});
export type SoundSet = z.infer<typeof soundSetSchema>;

export const chapterIdSchema = z.enum(CHAPTER_IDS);
export type SetChapterId = z.infer<typeof chapterIdSchema>;
