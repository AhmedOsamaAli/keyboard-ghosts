import { whiteNoise } from '../noise';
import { FLOOR, SIXTY_DB, bufferSource, handleOf, voiceOut } from './env';
import { sumInputs } from '../graph/mixer';
import type { VoiceBuild } from './types';

/** A breath: filtered noise that swells for about a second, then thins into a soft tone. */
export const breath: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const swell = s['swellS'] ?? 1;
  const thin = s['thinS'] ?? 1.2;
  const tail = s['tailS'] ?? 0.8;
  const total = swell + thin + tail + 0.2;
  const noise = bufferSource(
    ctx,
    whiteNoise(rng.fork('breath'), Math.ceil(total * ctx.sampleRate)),
  );
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = s['lowHz'] ?? 500;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s['highHz'] ?? 3000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(FLOOR, at);
  env.gain.linearRampToValueAtTime(1, at + swell);
  env.gain.exponentialRampToValueAtTime(SIXTY_DB * 0.5, at + swell + thin);
  env.gain.setValueAtTime(0, at + swell + thin + 0.001);
  // A second stage on each side keeps the breath inside its band (round 1 of the review).
  const hp2 = ctx.createBiquadFilter();
  hp2.type = 'highpass';
  hp2.frequency.value = hp.frequency.value;
  const lp2 = ctx.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.frequency.value = lp.frequency.value;
  noise.connect(hp).connect(hp2).connect(lp).connect(lp2).connect(env).connect(trim);
  noise.start(at);
  noise.stop(at + total);

  const tone = ctx.createOscillator();
  tone.frequency.value = s['toneHz'] ?? 300;
  const tg = ctx.createGain();
  const level = s['toneLevel'] ?? 0.12;
  tg.gain.setValueAtTime(0, at);
  tg.gain.setValueAtTime(0, at + swell * 0.8);
  tg.gain.linearRampToValueAtTime(level, at + swell + thin * 0.7);
  tg.gain.setValueAtTime(level, at + swell + thin + tail);
  tg.gain.linearRampToValueAtTime(0, at + total);
  tone.connect(tg).connect(trim);
  tone.start(at);
  tone.stop(at + total);
  return handleOf(total, [noise, tone]);
};

/** A whoosh: noise through a band-pass that sweeps up while the sound swells and fades. */
export const whoosh: VoiceBuild = (ctx, out, at, s, rng) => {
  const trim = voiceOut(ctx, out, s);
  const duration = s['durationS'] ?? 0.9;
  const sweep = s['sweepS'] ?? 0.7;
  const noise = bufferSource(
    ctx,
    whiteNoise(rng.fork('whoosh'), Math.ceil(duration * ctx.sampleRate)),
  );
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = s['q'] ?? 2;
  band.frequency.setValueAtTime(s['fromHz'] ?? 400, at);
  band.frequency.exponentialRampToValueAtTime(s['toHz'] ?? 2400, at + sweep);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(1, at + Math.min(0.25, duration / 3));
  env.gain.exponentialRampToValueAtTime(0.003, at + duration);
  env.gain.setValueAtTime(0, at + duration + 0.001);
  noise.connect(band).connect(env).connect(trim);
  noise.start(at);
  noise.stop(at + duration);
  return handleOf(duration, [noise]);
};

/** A soft major chord (4:5:6 and an octave). With `rise`, each note slides up a whole tone over 2 s. */
export const chord: VoiceBuild = (ctx, out, at, s) => {
  const trim = voiceOut(ctx, out, s);
  const root = s['rootHz'] ?? 220;
  const attack = s['attackS'] ?? 0.15;
  const tail = s['tailS'] ?? 2;
  const tri = s['triangleLevel'] ?? 0.3;
  const notes = [
    { ratio: 1, level: 1 },
    { ratio: 1.25, level: 1 },
    { ratio: 1.5, level: 1 },
    { ratio: 2, level: s['octaveLevel'] ?? 0.5 },
  ];
  const norm = 1 / (notes.reduce((sum, n) => sum + n.level, 0) * (1 + tri));
  const sources: OscillatorNode[] = [];
  const end = at + attack + tail;
  const ins = sumInputs(ctx, trim, notes.length * 2);
  for (const note of notes) {
    const f = root * note.ratio;
    for (const [type, level] of [
      ['sine', 1],
      ['triangle', tri],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f, at);
      if ((s['rise'] ?? 0) >= 0.5) {
        osc.frequency.exponentialRampToValueAtTime(f * 2 ** (2 / 12), at + 2);
      }
      const g = ctx.createGain();
      const peak = note.level * level * norm;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(Math.max(FLOOR, peak * SIXTY_DB), end);
      g.gain.setValueAtTime(0, end + 0.001);
      osc.connect(g).connect(ins[sources.length] as GainNode);
      osc.start(at);
      osc.stop(end + 0.01);
      sources.push(osc);
    }
  }
  return handleOf(attack + tail, sources);
};
