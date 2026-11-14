import { fireBuffer } from './buffers';
import { bufferSource, handleOf, lfo, loopHz, voiceOut } from './env';
import { edgeFade, lengthOf, noiseFor } from './ambient';
import type { VoiceBuild } from './types';

/** Fire: a very low rumble and sparse crackle bursts, made as one buffer. */
export const fire: VoiceBuild = (ctx, out, at, s, rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const seconds = lengthOf(s, loopSeconds);
  const src = bufferSource(
    ctx,
    fireBuffer(rng.fork('fire'), ctx.sampleRate, seconds, s),
    !!loopSeconds,
  );
  src.connect(edgeFade(ctx, at, seconds, loopSeconds)).connect(trim);
  src.start(at);
  if (!loopSeconds) src.stop(at + seconds);
  return handleOf(seconds, [src]);
};

/** A murmur: noise through two formant band-passes with a drifting 3 to 5 Hz swell. */
export const murmur: VoiceBuild = (ctx, out, at, s, rng, loopSeconds) => {
  const trim = voiceOut(ctx, out, s);
  const seconds = lengthOf(s, loopSeconds);
  const src = noiseFor(ctx, rng, 'pink', s, at, loopSeconds);
  const mix = ctx.createGain();
  const ceiling = ctx.createBiquadFilter();
  ceiling.type = 'lowpass';
  ceiling.frequency.value = (s['formantHighHz'] ?? 1500) * 1.2;
  mix.connect(ceiling);
  for (const hz of [s['formantLowHz'] ?? 500, s['formantHighHz'] ?? 1500]) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hz;
    f.Q.value = s['formantQ'] ?? 5;
    src.connect(f).connect(mix);
  }
  const depth = s['swellDepth'] ?? 0.6;
  const amp = ctx.createGain();
  amp.gain.value = 1 - depth / 2;
  const swell = lfo(ctx, amp.gain, loopHz(s['swellHz'] ?? 4, loopSeconds), depth / 2, at);
  // A slow second oscillator moves the swell rate, so the syllables never become a steady beat.
  const drift = lfo(ctx, swell.frequency, loopHz(s['driftHz'] ?? 0.07, loopSeconds), 0.8, at);
  ceiling
    .connect(amp)
    .connect(edgeFade(ctx, at, seconds, loopSeconds))
    .connect(trim);
  if (!loopSeconds) {
    swell.stop(at + seconds);
    drift.stop(at + seconds);
  }
  return handleOf(seconds, [src, swell, drift]);
};

/** Thunder: a low rumble that swells and then fades slowly. */
export const thunder: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const attack = s['attackS'] ?? 0.4;
  const decay = s['decayS'] ?? 5.5;
  const seconds = attack + decay + 0.1;
  const src = noiseFor(ctx, rng, 'brown', { durationS: seconds }, at);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = s['lowHz'] ?? 25;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s['highHz'] ?? 120;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(1, at + attack);
  env.gain.exponentialRampToValueAtTime(0.001, at + attack + decay);
  env.gain.setValueAtTime(0, at + attack + decay + 0.001);
  src.connect(hp).connect(lp).connect(env).connect(trim);
  return handleOf(attack + decay, [src]);
};
