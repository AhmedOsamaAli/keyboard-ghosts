import type { VoiceId } from '../schema';
import { rainRoof, roomTone, wind, windGaps } from './ambient';
import { chime, churchBell, clockChime, glassRing, musicBox } from './bells';
import { breath, chord, whoosh } from './gesture';
import { bars, bigDoor, chains, creak } from './mechanical';
import { clockTick, drip, heartbeat, tap } from './percussive';
import { drone, riser } from './score';
import { fire, murmur, thunder } from './texture';
import type { VoiceBuild } from './types';

/** Every voice. A missing voice is a compile error. */
export const VOICE_BUILDERS: Record<VoiceId, VoiceBuild> = {
  tap,
  chime,
  'glass-ring': glassRing,
  'clock-chime': clockChime,
  'church-bell': churchBell,
  'clock-tick': clockTick,
  breath,
  whoosh,
  wind,
  'wind-gaps': windGaps,
  'room-tone': roomTone,
  fire,
  'rain-roof': rainRoof,
  thunder,
  'floor-creak': creak,
  'door-creak': creak,
  'big-door': bigDoor,
  chains,
  bars,
  chord,
  murmur,
  drip,
  'music-box': musicBox,
  drone,
  riser,
  heartbeat,
};
