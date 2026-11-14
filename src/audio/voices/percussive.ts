import { whiteNoise } from '../noise';
import { attackDecay, bufferSource, handleOf, partial, voiceOut } from './env';
import { tickBuffer } from './buffers';
import { sumInputs } from '../graph/mixer';
import type { VoiceBuild } from './types';

/** A wooden tap: a short noise burst through a band-pass, plus a falling low sine. */
export const tap: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const burstS = (s['burstMs'] ?? 50) / 1000;
  const noise = bufferSource(
    ctx,
    whiteNoise(rng.fork('tap'), Math.ceil((burstS + 0.01) * ctx.sampleRate)),
  );
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = s['bandHz'] ?? 1300;
  band.Q.value = s['bandQ'] ?? 5;
  const g = ctx.createGain();
  attackDecay(g.gain, at, s['noiseLevel'] ?? 1, 0.001, burstS);
  noise.connect(band).connect(g).connect(trim);
  noise.start(at);
  noise.stop(at + burstS + 0.01);

  const sineS = (s['sineMs'] ?? 60) / 1000;
  const sine = ctx.createOscillator();
  sine.frequency.setValueAtTime(s['sineFromHz'] ?? 180, at);
  sine.frequency.exponentialRampToValueAtTime(s['sineToHz'] ?? 90, at + sineS);
  const sg = ctx.createGain();
  attackDecay(sg.gain, at, s['sineLevel'] ?? 0.35, 0.001, sineS);
  sine.connect(sg).connect(trim);
  sine.start(at);
  sine.stop(at + sineS + 0.01);
  return handleOf(Math.max(burstS, sineS) + 0.01, [noise, sine]);
};

/** A clock tick: one click, or a loop of tick and tock when it is a bed. */
export const clockTick: VoiceBuild = (ctx, out, at, s, rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const src = bufferSource(
    ctx,
    tickBuffer(rng.fork('tick'), ctx.sampleRate, s, loopSeconds),
    !!loopSeconds,
  );
  src.connect(trim);
  src.start(at);
  return handleOf(loopSeconds ?? src.buffer?.duration ?? 0.02, [src]);
};

/** An ink drop: a sine blip that rises fast, with a faint quiet tail. */
export const drip: VoiceBuild = (ctx, out, at, s) => {
  const trim = voiceOut(ctx, out, s);
  const riseS = (s['riseMs'] ?? 40) / 1000;
  const decayS = (s['decayMs'] ?? 60) / 1000;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(s['fromHz'] ?? 800, at);
  osc.frequency.exponentialRampToValueAtTime(s['toHz'] ?? 1600, at + riseS);
  const g = ctx.createGain();
  attackDecay(g.gain, at, 1, 0.002, decayS);
  osc.connect(g).connect(trim);
  osc.start(at);
  osc.stop(at + decayS + 0.01);
  const tail = partial(
    ctx,
    trim,
    s['toHz'] ?? 1600,
    s['tailLevel'] ?? 0.1,
    at + riseS,
    0.005,
    s['tailS'] ?? 0.25,
  );
  return handleOf(Math.max(decayS, riseS + (s['tailS'] ?? 0.25)), [osc, tail.osc]);
};

/** A heartbeat: two low thumps, repeated. */
export const heartbeat: VoiceBuild = (ctx, out, at, s) => {
  const trim = voiceOut(ctx, out, s);
  const count = Math.max(1, Math.round(s['count'] ?? 3));
  const period = s['periodS'] ?? 0.9;
  const gap = s['gapS'] ?? 0.28;
  const decay = s['thumpDecayS'] ?? 0.35;
  const sources: OscillatorNode[] = [];
  const inputs = sumInputs(ctx, trim, count * 2);
  for (let n = 0; n < count; n++) {
    const t = at + n * period;
    const a = partial(ctx, inputs[2 * n] as GainNode, s['thumpHz1'] ?? 60, 0.6, t, 0.01, decay);
    const b = partial(
      ctx,
      inputs[2 * n + 1] as GainNode,
      s['thumpHz2'] ?? 50,
      0.5,
      t + gap,
      0.01,
      decay,
    );
    sources.push(a.osc, b.osc);
  }
  return handleOf((count - 1) * period + gap + decay, sources);
};
