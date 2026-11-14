import { sumInputs } from '../graph/mixer';
import { partial, voiceOut, handleOf } from './env';
import { normalised, partialDecay, readPartials } from './partials';
import type { VoiceBuild } from './types';

const ATTACK_S = 0.003;

/** A bell: sine partials at the given ratios, each with its own fade (tail / ratio ^ exponent). */
function bell(count: number): VoiceBuild {
  return (ctx, out, at, s) => {
    const trim = voiceOut(ctx, out, s);
    const f0 = s['fundamentalHz'] ?? 440;
    const sources: OscillatorNode[] = [];
    let end = at;
    const inputs = sumInputs(ctx, trim, count);
    normalised(readPartials(s, count)).forEach((p, i) => {
      const decay = partialDecay(s['tailS'] ?? 2, p.ratio, s['fadeExponent'] ?? 1);
      const made = partial(ctx, inputs[i] as GainNode, f0 * p.ratio, p.level, at, ATTACK_S, decay);
      sources.push(made.osc);
      end = Math.max(end, made.end);
    });
    return handleOf(end - at, sources);
  };
}

export const chime = bell(4);
export const glassRing = bell(5);
export const clockChime = bell(5);
export const churchBell = bell(8);

/** A music-box tine: three partials, each with its own decay time. */
export const musicBox: VoiceBuild = (ctx, out, at, s) => {
  const trim = voiceOut(ctx, out, s);
  const f0 = s['fundamentalHz'] ?? 784;
  const sources: OscillatorNode[] = [];
  let end = at;
  const inputs = sumInputs(ctx, trim, 3);
  normalised(readPartials(s, 3)).forEach((p, i) => {
    const decay = s[`decay${i + 1}`] ?? 0.5;
    const made = partial(ctx, inputs[i] as GainNode, f0 * p.ratio, p.level, at, 0.002, decay);
    sources.push(made.osc);
    end = Math.max(end, made.end);
  });
  return handleOf(end - at, sources);
};
