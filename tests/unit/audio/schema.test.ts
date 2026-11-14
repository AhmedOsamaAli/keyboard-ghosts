import { describe, expect, it } from 'vitest';
import {
  EVENT_IDS,
  GLOBAL_EVENT_IDS,
  VOICE_IDS,
  bedLayerSchema,
  eventSchema,
  soundSetSchema,
} from '../../../src/audio/schema';

const bed = {
  id: 'wind',
  voice: 'wind',
  levelDb: -33,
  loopSeconds: 47,
  fadeIn: 2,
  fadeOut: 2,
  caption: '[cold wind blows]',
  sample: null,
};
const event = {
  id: 'repair',
  caption: '[a chime rings]',
  steps: [{ voice: 'chime', bus: 'stinger', levelDb: -9, at: 0, sample: null }],
};

describe('audio schema', () => {
  it('lists 26 voices and 7 global events', () => {
    expect(VOICE_IDS).toHaveLength(26);
    expect(GLOBAL_EVENT_IDS).toHaveLength(7);
    expect(new Set(EVENT_IDS).size).toBe(EVENT_IDS.length);
  });

  it('accepts a valid set', () => {
    const set = { room: 0.5, beds: [bed], events: [event], needsSample: [] };
    expect(soundSetSchema.safeParse(set).success).toBe(true);
  });

  it('rejects broken fields', () => {
    expect(bedLayerSchema.safeParse({ ...bed, voice: 'violin' }).success).toBe(false);
    expect(bedLayerSchema.safeParse({ ...bed, loopSeconds: 0 }).success).toBe(false);
    expect(bedLayerSchema.safeParse({ ...bed, caption: undefined }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, steps: [] }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, id: 'boom' }).success).toBe(false);
    const step = { voice: 'chime', bus: 'air', levelDb: -9, at: 0, sample: null };
    expect(eventSchema.safeParse({ ...event, steps: [step] }).success).toBe(false);
  });
});
