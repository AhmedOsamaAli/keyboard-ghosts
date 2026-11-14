/** The test's own copy of the tables in section 6 of the brief. Do not import it from src. */
export const CHAPTERS = [
  'porch',
  'foyer',
  'chapel',
  'gallery',
  'library',
  'attic',
  'finale',
] as const;
export type Chapter = (typeof CHAPTERS)[number];

export const GLOBAL_EVENTS = [
  'tab-tick',
  'light-dies',
  'repair',
  'ghost-breath',
  'ghost-release',
  'chapter-card',
  'level-solved',
] as const;

/** Every voice the engine must have a recipe for. */
export const VOICES = [
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

export interface ChapterRow {
  room: number;
  /** Bed layers: voice and loop seconds. */
  beds: readonly { voice: string; loop: number }[];
  /** Chapter events besides the seven global ones. */
  events: readonly string[];
  /** The voices of the repair stinger, in order. */
  repair: readonly string[];
  needsSample: readonly string[];
}

export const TABLE: Record<Chapter, ChapterRow> = {
  porch: {
    room: 0.5,
    beds: [
      { voice: 'wind', loop: 47 },
      { voice: 'clock-tick', loop: 61 },
    ],
    events: [],
    repair: ['chime'],
    needsSample: [],
  },
  foyer: {
    room: 0.9,
    beds: [
      { voice: 'fire', loop: 53 },
      { voice: 'room-tone', loop: 61 },
    ],
    events: ['clock-chime', 'floor-creak', 'door-creak'],
    repair: ['glass-ring'],
    needsSample: ['match'],
  },
  chapel: {
    room: 3.2,
    beds: [
      { voice: 'room-tone', loop: 47 },
      { voice: 'drone', loop: 59 },
    ],
    events: ['church-bell', 'bars', 'chains', 'big-door'],
    repair: ['church-bell', 'bars'],
    needsSample: ['organ and singing'],
  },
  gallery: {
    room: 1.6,
    beds: [
      { voice: 'murmur', loop: 47 },
      { voice: 'clock-tick', loop: 61 },
    ],
    events: [],
    repair: ['music-box'],
    needsSample: ['footsteps (stone and wood)', 'cloth'],
  },
  library: {
    room: 0.7,
    beds: [
      { voice: 'room-tone', loop: 53 },
      { voice: 'rain-roof', loop: 67 },
    ],
    events: ['drip'],
    repair: ['chime'],
    needsSample: ['pages', 'pencil'],
  },
  attic: {
    room: 1.2,
    beds: [
      { voice: 'wind-gaps', loop: 47 },
      { voice: 'rain-roof', loop: 61 },
    ],
    events: ['floor-creak', 'door-creak', 'chains', 'heartbeat', 'thunder', 'riser'],
    repair: ['chime'],
    needsSample: ['boxes'],
  },
  finale: {
    room: 2.0,
    beds: [
      { voice: 'room-tone', loop: 53 },
      { voice: 'wind', loop: 67 },
    ],
    events: ['big-door'],
    repair: ['church-bell', 'chord'],
    needsSample: ['birds at dawn', 'footsteps leaving'],
  },
};
