import type { Rng } from '../../engine/index';
import type { CaptionEvent } from '../captions';
import { dbToGain } from '../db';
import { oneShotGainDb } from '../levels';
import type { EventId, SoundSet } from '../schema';
import { TAB_TICK_LIMITS, DEFAULT_LIMITS, noVariation, vary } from '../variation';
import { settingsFor } from '../voices/params';
import { VOICE_BUILDERS } from '../voices/index';
import { applyVariation } from '../voices/variation-keys';
import type { Tuning } from './beds';
import type { Chain } from './chain';

export interface PlayDeps {
  ctx: BaseAudioContext;
  chain: Chain;
  rng: Rng;
  tuning?: Tuning;
  /** Variation is on by default. Tests switch it off to measure levels. */
  variation: boolean;
  caption(event: CaptionEvent, at: number): void;
  onFocus(state: 'lit' | 'dim'): void;
}

export interface Player {
  /** Plays an event of the set. Returns false when the set has no such event. */
  play(set: SoundSet, id: EventId, at: number): boolean;
}

/** The silence between the light dying and the breath rising, in seconds. */
export const SILENCE_SECONDS = 0.4;

export function createPlayer(deps: PlayDeps): Player {
  const { ctx, chain } = deps;
  let count = 0;

  return {
    play(set, id, at) {
      const event = set.events.find((e) => e.id === id);
      if (!event) return false;
      const n = count++;
      deps.caption({ id, text: event.caption, quiet: id === 'tab-tick' }, at);

      if (id === 'light-dies') {
        chain.closeFocus(at);
        chain.duckBeds(at, 0.35);
        const breath = event.steps.find((s) => s.voice === 'breath');
        const swell = breath ? settingsFor('breath', breath.params, deps.tuning)['swellS'] : 1;
        chain.riseBreath(at + (breath?.at ?? SILENCE_SECONDS), swell ?? 1);
        deps.onFocus('dim');
      } else if (id === 'repair') {
        chain.openFocus(at);
        chain.restoreBeds(at, 0.5);
        deps.onFocus('lit');
      }

      event.steps.forEach((step, i) => {
        const base = settingsFor(step.voice, step.params, deps.tuning);
        const limits = id === 'tab-tick' ? TAB_TICK_LIMITS : DEFAULT_LIMITS;
        const start = { freqHz: 1, levelDb: step.levelDb, filterHz: 1 };
        const v = deps.variation
          ? vary(deps.rng.fork(`var:${n}:${i}`), start, limits)
          : noVariation(start);
        const settings = applyVariation(step.voice, base, v.freqHz, v.filterHz);
        const gain = ctx.createGain();
        gain.gain.value = dbToGain(oneShotGainDb(v.levelDb));
        const slots =
          step.bus === 'stinger'
            ? chain.stingerSlots
            : step.voice === 'breath'
              ? chain.breathSlots
              : chain.worldSlots;
        const startAt = at + step.at;
        const handle = VOICE_BUILDERS[step.voice](
          ctx,
          gain,
          startAt,
          settings,
          deps.rng.fork(`play:${n}:${id}:${i}`),
        );
        slots.add(gain, startAt, startAt + handle.duration + 0.1);
      });
      return true;
    },
  };
}
