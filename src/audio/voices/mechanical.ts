import type { Rng } from '../../engine/index';
import { whiteNoise } from '../noise';
import { FLOOR, attackDecay, bufferSource, handleOf, partial, voiceOut } from './env';
import type { Settings } from './params';
import { sumInputs } from '../graph/mixer';
import type { VoiceBuild } from './types';

/**
 * A creak: a sawtooth whose pitch wanders through a resonant band-pass that follows it, with a
 * stick-slip amplitude (a sawtooth at 8 to 25 Hz). Used for floors, doors and hinges.
 */
export function creakInto(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  s: Settings,
  rng: Rng,
  level = 1,
): { duration: number; sources: OscillatorNode[] } {
  const duration = s['durationS'] ?? 0.9;
  const low = s['pitchLowHz'] ?? 120;
  const high = s['pitchHighHz'] ?? 400;
  const rate = Math.max(2, s['wanderRate'] ?? 20);
  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = s['bandQ'] ?? 8;
  const walk = rng.fork('creak');
  let x = walk.next();
  const steps = Math.max(2, Math.ceil(duration * rate));
  for (let i = 0; i <= steps; i++) {
    x = Math.min(1, Math.max(0, x + (walk.next() - 0.5) * 0.5));
    const hz = low * (high / low) ** x;
    const t = at + (i / steps) * duration;
    if (i === 0) {
      saw.frequency.setValueAtTime(hz, t);
      band.frequency.setValueAtTime(hz * (s['bandRatio'] ?? 3), t);
    } else {
      saw.frequency.linearRampToValueAtTime(hz, t);
      band.frequency.linearRampToValueAtTime(hz * (s['bandRatio'] ?? 3), t);
    }
  }
  const depth = s['slipDepth'] ?? 0.7;
  const slip = ctx.createGain();
  slip.gain.value = 1 - depth / 2;
  const slipOsc = ctx.createOscillator();
  slipOsc.type = 'sawtooth';
  slipOsc.frequency.value = s['slipHz'] ?? 14;
  const slipDepth = ctx.createGain();
  slipDepth.gain.value = depth / 2;
  slipOsc.connect(slipDepth).connect(slip.gain);
  const env = ctx.createGain();
  const edge = Math.min(0.08, duration / 4);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + edge);
  env.gain.setValueAtTime(level, at + duration - edge * 2);
  env.gain.linearRampToValueAtTime(0, at + duration);
  saw.connect(band).connect(slip).connect(env).connect(out);
  for (const o of [saw, slipOsc]) {
    o.start(at);
    o.stop(at + duration + 0.01);
  }
  return { duration, sources: [saw, slipOsc] };
}

/** `floor-creak` and `door-creak` are the same recipe with different settings. */
export const creak: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const made = creakInto(ctx, trim, at, s, rng);
  return handleOf(made.duration, made.sources);
};

/** A heavy door: a low thud, then a slow creak. */
export const bigDoor: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const thudS = s['thudS'] ?? 0.3;
  const thud = ctx.createOscillator();
  const hz = s['thudHz'] ?? 60;
  thud.frequency.setValueAtTime(hz * 1.4, at);
  thud.frequency.exponentialRampToValueAtTime(hz * 0.7, at + thudS);
  const g = ctx.createGain();
  attackDecay(g.gain, at, 1, 0.004, thudS);
  thud.connect(g).connect(trim);
  thud.start(at);
  thud.stop(at + thudS + 0.01);
  const delay = s['creakDelayS'] ?? 0.25;
  const made = creakInto(ctx, trim, at + delay, s, rng, s['creakLevel'] ?? 0.5);
  return handleOf(Math.max(thudS, delay + made.duration), [thud, ...made.sources]);
};

/** Chains: short bursts of metallic partials at random spacing. */
export const chains: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const r = rng.fork('chains');
  const bursts = Math.max(1, Math.round(s['burstCount'] ?? 7));
  const per = Math.max(1, Math.round(s['partialsPerBurst'] ?? 3));
  const decay = s['partialDecayS'] ?? 0.12;
  const low = s['partialLowHz'] ?? 2000;
  const high = s['partialHighHz'] ?? 6000;
  const sources: OscillatorNode[] = [];
  const ins = sumInputs(ctx, trim, bursts * per);
  let t = at;
  for (let i = 0; i < bursts; i++) {
    t +=
      (s['spacingMinS'] ?? 0.04) +
      r.next() * ((s['spacingMaxS'] ?? 0.14) - (s['spacingMinS'] ?? 0.04));
    const amp = (0.5 + 0.5 * r.next()) / per;
    for (let k = 0; k < per; k++) {
      const into = ins[i * per + k] as GainNode;
      sources.push(partial(ctx, into, low * (high / low) ** r.next(), amp, t, 0.001, decay).osc);
    }
  }
  return handleOf(t - at + decay, sources);
};

/** Bars lifting: a rising scrape, then a clank of two inharmonic partials. */
export const bars: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const scrapeS = s['scrapeS'] ?? 0.6;
  const noise = bufferSource(
    ctx,
    whiteNoise(rng.fork('bars'), Math.ceil((scrapeS + 0.05) * ctx.sampleRate)),
  );
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = s['scrapeQ'] ?? 3;
  band.frequency.setValueAtTime(s['scrapeFromHz'] ?? 1000, at);
  band.frequency.exponentialRampToValueAtTime(s['scrapeToHz'] ?? 3000, at + scrapeS);
  const env = ctx.createGain();
  env.gain.setValueAtTime(FLOOR, at);
  env.gain.exponentialRampToValueAtTime(s['scrapeLevel'] ?? 0.8, at + scrapeS);
  env.gain.linearRampToValueAtTime(0, at + scrapeS + 0.03);
  const ins = sumInputs(ctx, trim, 3);
  noise
    .connect(band)
    .connect(env)
    .connect(ins[0] as GainNode);
  noise.start(at);
  noise.stop(at + scrapeS + 0.05);
  const clankS = s['clankS'] ?? 0.4;
  const level = s['clankLevel'] ?? 1;
  const a = partial(
    ctx,
    ins[1] as GainNode,
    s['clankHz1'] ?? 1100,
    level * 0.6,
    at + scrapeS,
    0.002,
    clankS,
  );
  const b = partial(
    ctx,
    ins[2] as GainNode,
    s['clankHz2'] ?? 2700,
    level * 0.4,
    at + scrapeS,
    0.002,
    clankS,
  );
  return handleOf(scrapeS + clankS, [noise, a.osc, b.osc]);
};
