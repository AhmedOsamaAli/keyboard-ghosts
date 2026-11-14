import { MASTER_DEFAULT_DB } from './db';
import { VOICE_REFERENCE_PEAK_DB } from './voices/types';

/**
 * A set's `levelDb` is the level at the final output with the master at its default. The voice
 * already sits at its reference peak, and the master comes after, so the gain to apply is the
 * difference. One-shots and stingers are peaks.
 */
export function oneShotGainDb(levelDb: number): number {
  return levelDb - VOICE_REFERENCE_PEAK_DB - MASTER_DEFAULT_DB;
}

/** Beds are RMS: `rmsDb` is the voice's own measured RMS after its trim. */
export function bedGainDb(levelDb: number, rmsDb: number): number {
  return levelDb - rmsDb - MASTER_DEFAULT_DB;
}
