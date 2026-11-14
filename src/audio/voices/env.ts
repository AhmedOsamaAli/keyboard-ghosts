import { dbToGain } from '../db';
import type { Settings } from './params';
import type { VoiceHandle } from './types';

/** The smallest gain used in an exponential ramp (exponential ramps cannot reach 0). */
export const FLOOR = 0.0001;

/** -60 dB as an amplitude. */
export const SIXTY_DB = 0.001;

/** A gain node that applies the voice's `trimDb` and feeds `out`. */
export function voiceOut(ctx: BaseAudioContext, out: AudioNode, s: Settings): GainNode {
  const trim = ctx.createGain();
  trim.gain.value = dbToGain(s['trimDb'] ?? 0);
  trim.connect(out);
  return trim;
}

/**
 * An envelope on a gain parameter: a short linear attack to `peak`, then a fall of 60 dB over
 * `decay60S` seconds. Returns the time the envelope ends.
 */
export function attackDecay(
  param: AudioParam,
  at: number,
  peak: number,
  attackS: number,
  decay60S: number,
): number {
  const top = at + attackS;
  const end = top + decay60S;
  param.setValueAtTime(FLOOR, at);
  param.linearRampToValueAtTime(peak, top);
  param.exponentialRampToValueAtTime(Math.max(FLOOR, peak * SIXTY_DB), end);
  param.setValueAtTime(0, end + 0.001);
  return end;
}

/** A sine (or other wave) partial that rises and falls by 60 dB. Returns its end time. */
export function partial(
  ctx: BaseAudioContext,
  out: AudioNode,
  freq: number,
  level: number,
  at: number,
  attackS: number,
  decay60S: number,
  type: OscillatorType = 'sine',
): { osc: OscillatorNode; end: number } {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  const end = attackDecay(g.gain, at, level, attackS, decay60S);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(end + 0.01);
  return { osc, end };
}

/** A buffer source that holds `samples`. */
export function bufferSource(
  ctx: BaseAudioContext,
  samples: Float32Array,
  loop = false,
): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = loop;
  return src;
}

/** A frequency that fits a whole number of cycles into a loop, so the loop joins without a click. */
export function loopHz(hz: number, loopSeconds?: number): number {
  if (!loopSeconds) return hz;
  return Math.max(1, Math.round(hz * loopSeconds)) / loopSeconds;
}

/** Sources that a voice started, stopped together. */
export function handleOf(duration: number, sources: AudioScheduledSourceNode[]): VoiceHandle {
  return {
    duration,
    stop(at) {
      for (const s of sources) {
        try {
          s.stop(at);
        } catch {
          // A source that has not started cannot be stopped; there is nothing to do.
        }
      }
    },
  };
}

/** A low-frequency oscillator added to `target` with the given depth. */
export function lfo(
  ctx: BaseAudioContext,
  target: AudioParam,
  hz: number,
  depth: number,
  at: number,
  type: OscillatorType = 'sine',
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(target);
  osc.start(at);
  return osc;
}
