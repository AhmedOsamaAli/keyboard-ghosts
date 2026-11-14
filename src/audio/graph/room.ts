import type { Rng } from '../../engine/index';
import { dbToGain } from '../db';
import { generateImpulse } from '../impulse';

/** How loud the room echo is, relative to the sound that feeds it. */
export const ROOM_WET_DB = -22;

export interface Room {
  /** Connect buses here. */
  input: AudioNode;
  /** Connect this to the mix. */
  output: AudioNode;
  /** Builds the echo for a room of `seconds` (a new impulse from the generator). */
  setRoom(seconds: number, rng: Rng): void;
  dispose(): void;
}

/** The room echo: a convolver with a generated impulse. A new convolver is built for each room. */
export function createRoom(ctx: BaseAudioContext): Room {
  const input = ctx.createGain();
  const output = ctx.createGain();
  output.gain.value = dbToGain(ROOM_WET_DB);
  let current: ConvolverNode | null = null;
  return {
    input,
    output,
    setRoom(seconds, rng) {
      const impulse = generateImpulse(seconds, ctx.sampleRate, rng);
      const buffer = ctx.createBuffer(1, impulse.length, ctx.sampleRate);
      buffer.copyToChannel(impulse as Float32Array<ArrayBuffer>, 0);
      const next = ctx.createConvolver();
      next.buffer = buffer;
      input.connect(next).connect(output);
      if (current) {
        input.disconnect(current);
        current.disconnect();
      }
      current = next;
    },
    dispose() {
      input.disconnect();
      current?.disconnect();
      current = null;
    },
  };
}
