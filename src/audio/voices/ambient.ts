import type { Rng } from '../../engine/index';
import { brownNoise, pinkNoise, whiteNoise } from '../noise';
import { bufferSource, handleOf, lfo, loopHz, voiceOut } from './env';
import type { Settings } from './params';
import { sumInputs } from '../graph/mixer';
import type { VoiceBuild } from './types';

type Kind = 'white' | 'pink' | 'brown';

/** Seconds of sound this voice makes: the loop length for a bed, else its own `durationS`. */
export function lengthOf(s: Settings, loopSeconds?: number): number {
  return loopSeconds ?? s['durationS'] ?? 8;
}

/** A noise source that loops for a bed and runs `durationS` otherwise. */
export function noiseFor(
  ctx: BaseAudioContext,
  rng: Rng,
  kind: Kind,
  s: Settings,
  at: number,
  loopSeconds?: number,
): AudioBufferSourceNode {
  const seconds = lengthOf(s, loopSeconds);
  const make = kind === 'white' ? whiteNoise : kind === 'pink' ? pinkNoise : brownNoise;
  const src = bufferSource(
    ctx,
    make(rng.fork(kind), Math.round(seconds * ctx.sampleRate)),
    !!loopSeconds,
  );
  src.start(at);
  if (!loopSeconds) src.stop(at + seconds);
  return src;
}

/** Fades the ends of a voice that is not a loop, so it starts and stops cleanly. */
export function edgeFade(
  ctx: BaseAudioContext,
  at: number,
  seconds: number,
  loopSeconds?: number,
): GainNode {
  const g = ctx.createGain();
  if (loopSeconds) return g;
  const fade = Math.min(0.1, seconds / 4);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(1, at + fade);
  g.gain.setValueAtTime(1, at + seconds - fade);
  g.gain.linearRampToValueAtTime(0, at + seconds);
  return g;
}

/** Cold wind: pink noise through a band-pass whose centre drifts, with a level that drifts too. */
function windVoice(withWhistles: boolean): VoiceBuild {
  return (ctx, out, at, s, rng, loopSeconds) => {
    const trim = voiceOut(ctx, out, s);
    const seconds = lengthOf(s, loopSeconds);
    const lo = s['centreLowHz'] ?? 300;
    const hi = s['centreHighHz'] ?? 900;
    const src = noiseFor(ctx, rng, 'pink', s, at, loopSeconds);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = Math.sqrt(lo * hi);
    band.Q.value = s['q'] ?? 1.5;
    const sweep = lfo(
      ctx,
      band.frequency,
      loopHz(s['driftHz'] ?? 0.08, loopSeconds),
      (hi - lo) / 2,
      at,
    );
    const amp = ctx.createGain();
    const drift = s['levelDrift'] ?? 0.35;
    amp.gain.value = 1 - drift / 2;
    const swell = lfo(ctx, amp.gain, loopHz(s['levelDriftHz'] ?? 0.13, loopSeconds), drift / 2, at);
    const edge = edgeFade(ctx, at, seconds, loopSeconds);
    const ceiling = ctx.createBiquadFilter();
    ceiling.type = 'lowpass';
    ceiling.frequency.value = hi * 2;
    const ins = sumInputs(ctx, amp, withWhistles ? 3 : 1);
    // A second band-pass that moves with the first makes the wind a moving band, not a hiss.
    const band2 = ctx.createBiquadFilter();
    band2.type = 'bandpass';
    band2.frequency.value = band.frequency.value;
    band2.Q.value = band.Q.value;
    const sweep2 = lfo(
      ctx,
      band2.frequency,
      loopHz(s['driftHz'] ?? 0.08, loopSeconds),
      (hi - lo) / 2,
      at,
    );
    // Round 2: a high-pass under the band removes the low rumble that made the wind sound like hiss.
    const floor = ctx.createBiquadFilter();
    floor.type = 'highpass';
    floor.frequency.value = lo / 2;
    src
      .connect(floor)
      .connect(band)
      .connect(band2)
      .connect(ceiling)
      .connect(ins[0] as GainNode);
    const sources: AudioScheduledSourceNode[] = [src, sweep, swell, sweep2];
    if (withWhistles) {
      for (const [n, key] of ['whistleHz1', 'whistleHz2'].entries()) {
        const whistle = ctx.createBiquadFilter();
        whistle.type = 'bandpass';
        whistle.frequency.value = s[key] ?? 1200;
        whistle.Q.value = s['whistleQ'] ?? 25;
        const wg = ctx.createGain();
        wg.gain.value = (s['whistleLevel'] ?? 0.3) * 6;
        const wob = lfo(
          ctx,
          whistle.frequency,
          loopHz(0.11, loopSeconds),
          (s[key] ?? 1200) * 0.05,
          at,
        );
        sources.push(wob);
        src
          .connect(whistle)
          .connect(wg)
          .connect(ins[n + 1] as GainNode);
      }
    }
    amp.connect(edge).connect(trim);
    if (!loopSeconds) for (const x of [sweep, swell, ...sources.slice(3)]) x.stop(at + seconds);
    return handleOf(seconds, sources);
  };
}

export const wind = windVoice(false);
export const windGaps = windVoice(true);

/** Room tone: brown noise through a soft low-pass. */
export const roomTone: VoiceBuild = (ctx, out, at, s, rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const seconds = lengthOf(s, loopSeconds);
  const src = noiseFor(ctx, rng, 'brown', s, at, loopSeconds);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s['lowpassHz'] ?? 400;
  src
    .connect(lp)
    .connect(edgeFade(ctx, at, seconds, loopSeconds))
    .connect(trim);
  return handleOf(seconds, [src]);
};

/** Rain on a roof: dense noise limited to a band. */
export const rainRoof: VoiceBuild = (ctx, out, at, s, rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const seconds = lengthOf(s, loopSeconds);
  const src = noiseFor(ctx, rng, 'white', s, at, loopSeconds);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = s['lowHz'] ?? 2200;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s['highHz'] ?? 7000;
  src
    .connect(hp)
    .connect(lp)
    .connect(edgeFade(ctx, at, seconds, loopSeconds))
    .connect(trim);
  return handleOf(seconds, [src]);
};
