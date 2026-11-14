import { whiteNoise } from '../noise';
import { FLOOR, bufferSource, handleOf, lfo, loopHz, voiceOut } from './env';
import { lengthOf } from './ambient';
import { sumInputs } from '../graph/mixer';
import type { VoiceBuild } from './types';

/** A drone: three detuned saws near 55 Hz through a slowly moving low-pass. */
export const drone: VoiceBuild = (ctx, out, at, s, _rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const seconds = lengthOf(s, loopSeconds);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s['lowpassHz'] ?? 180;
  lp.Q.value = 2;
  const sources: AudioScheduledSourceNode[] = [];
  sources.push(
    lfo(
      ctx,
      lp.frequency,
      loopHz(s['lowpassDriftHz'] ?? 0.06, loopSeconds),
      s['lowpassDepth'] ?? 70,
      at,
    ),
  );
  const detune = s['detuneCents'] ?? 9;
  const rise = s['riseCents'] ?? 0;
  const ins = sumInputs(ctx, lp, 3);
  for (const [n, cents] of [-detune, 0, detune].entries()) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = s['rootHz'] ?? 55;
    osc.detune.setValueAtTime(cents, at);
    if (rise !== 0) osc.detune.linearRampToValueAtTime(cents + rise, at + seconds);
    const g = ctx.createGain();
    g.gain.value = 1 / 3;
    osc.connect(g).connect(ins[n] as GainNode);
    osc.start(at);
    if (!loopSeconds) osc.stop(at + seconds);
    sources.push(osc);
  }
  const env = ctx.createGain();
  if (loopSeconds) {
    env.gain.value = 1;
  } else {
    const attack = Math.min(s['attackS'] ?? 0.05, seconds / 2);
    const release = Math.min(s['releaseS'] ?? 0.3, seconds / 2);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(1, at + attack);
    env.gain.setValueAtTime(1, at + seconds - release);
    env.gain.linearRampToValueAtTime(0, at + seconds);
    sources[0]?.stop(at + seconds);
  }
  lp.connect(env).connect(trim);
  return handleOf(seconds, sources);
};

/** A riser: noise and a rising sine that grow louder for several seconds. */
export const riser: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const rise = s['riseS'] ?? 4;
  const duration = s['durationS'] ?? 4.5;
  const noise = bufferSource(
    ctx,
    whiteNoise(rng.fork('riser'), Math.ceil(duration * ctx.sampleRate)),
  );
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(300, at);
  hp.frequency.exponentialRampToValueAtTime(3000, at + rise);
  const ng = ctx.createGain();
  ng.gain.value = s['noiseLevel'] ?? 0.4;
  const sine = ctx.createOscillator();
  sine.frequency.setValueAtTime(s['sineFromHz'] ?? 200, at);
  sine.frequency.exponentialRampToValueAtTime(s['sineToHz'] ?? 1600, at + rise);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.003, at);
  env.gain.exponentialRampToValueAtTime(1, at + rise);
  env.gain.setValueAtTime(1, at + duration - 0.1);
  env.gain.linearRampToValueAtTime(FLOOR, at + duration);
  noise.connect(hp).connect(ng).connect(env);
  sine.connect(env);
  env.connect(trim);
  noise.start(at);
  sine.start(at);
  noise.stop(at + duration);
  sine.stop(at + duration);
  return handleOf(duration, [noise, sine]);
};
