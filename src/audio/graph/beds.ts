import type { Rng } from '../../engine/index';
import { dbToGain } from '../db';
import { bedGainDb } from '../levels';
import type { BedLayer, SoundSet, VoiceId } from '../schema';
import { settingsFor } from '../voices/params';
import { VOICE_BUILDERS } from '../voices/index';
import type { VoiceHandle } from '../voices/types';
import type { Chain } from './chain';

/** The cross-fade between two rooms, in seconds. */
export const CROSSFADE_SECONDS = 3;

export type Tuning = Readonly<Partial<Record<VoiceId, Readonly<Record<string, number>>>>>;

export interface BedsDeps {
  ctx: BaseAudioContext;
  chain: Chain;
  rng: Rng;
  tuning?: Tuning;
  /** Called once when a layer starts. */
  caption(id: string, text: string, at: number): void;
}

interface Active {
  layer: BedLayer;
  gain: GainNode;
  target: number;
  handle: VoiceHandle;
  slot: number;
}

export interface Beds {
  /** Fades the old room's layers out and the new room's layers in. */
  setChapter(chapter: string, set: SoundSet, at: number): void;
  stopAll(at: number): void;
  /** The ids of the layers that are playing. */
  layers(): string[];
}

export function createBeds(deps: BedsDeps): Beds {
  const { ctx, chain, rng } = deps;
  let active: Active[] = [];
  let chapter: string | null = null;

  function start(layer: BedLayer, owner: string, at: number, fade: number): Active {
    const settings = settingsFor(layer.voice, layer.params, deps.tuning);
    const target = dbToGain(bedGainDb(layer.levelDb, settings['rmsDb'] ?? -20));
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(target, at + fade);
    const handle = VOICE_BUILDERS[layer.voice](
      ctx,
      gain,
      at,
      settings,
      rng.fork(`bed:${owner}:${layer.id}`),
      layer.loopSeconds,
    );
    const slot = chain.bedSlots.add(gain, at, Infinity);
    deps.caption(layer.id, layer.caption, at);
    return { layer, gain, target, handle, slot };
  }

  function stop(entry: Active, at: number, fade: number): void {
    entry.gain.gain.cancelScheduledValues(at);
    entry.gain.gain.setValueAtTime(entry.target, at);
    entry.gain.gain.linearRampToValueAtTime(0, at + fade);
    entry.handle.stop(at + fade + 0.05);
    chain.bedSlots.release(entry.slot, at + fade + 0.05);
  }

  return {
    setChapter(next, set, at) {
      if (chapter === next && active.length > 0) return;
      const crossfading = active.length > 0;
      for (const entry of active) stop(entry, at, CROSSFADE_SECONDS);
      active = set.beds.map((layer) =>
        start(layer, next, at, crossfading ? CROSSFADE_SECONDS : layer.fadeIn),
      );
      chapter = next;
    },
    stopAll(at) {
      for (const entry of active) stop(entry, at, 0.2);
      active = [];
      chapter = null;
    },
    layers: () => active.map((a) => a.layer.id),
  };
}
