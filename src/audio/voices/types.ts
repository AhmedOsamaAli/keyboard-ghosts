import type { Rng } from '../../engine/index';
import type { Settings } from './params';

/** A voice that has been scheduled. `duration` is in seconds from its start; beds last until `stop`. */
export interface VoiceHandle {
  duration: number;
  /** Stops every source at the context time `at`. */
  stop(at: number): void;
}

/**
 * Builds one voice into `out`, starting at the context time `at`.
 * With `loopSeconds` the voice is a bed: it loops with that length until `stop` is called.
 */
export type VoiceBuild = (
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  settings: Settings,
  rng: Rng,
  loopSeconds?: number,
) => VoiceHandle;

/** A voice is calibrated so its peak is this many dBFS at its own output. */
export const VOICE_REFERENCE_PEAK_DB = -3;
