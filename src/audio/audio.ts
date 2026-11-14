import { CHAPTER_IDS, createRng, type ChapterId, type Rng } from '../engine/index';
import { createCaptionMerger, type CaptionEvent } from './captions';
import { MASTER_DEFAULT_DB, clampMaster } from './db';
import { createBeds, type Beds, type Tuning } from './graph/beds';
import { createChain, type Chain } from './graph/chain';
import { createPlayer, type Player } from './graph/play';
import type { EventId } from './schema';
import { getSet } from './sets/index';

export type FocusState = 'lit' | 'dim';

export interface AudioState {
  enabled: boolean;
  chapter: ChapterId;
  focus: FocusState;
  masterDb: number;
  /** Ids of the bed layers that are playing. */
  layers: string[];
}

export interface AudioOptions {
  /** Seed for every random choice. The same seed gives the same sound. */
  seed?: number;
  /** Makes the context. Called only inside `enable()`. The default makes an `AudioContext`. */
  createContext?: () => BaseAudioContext;
  /** Seconds on the context's clock. The default is `ctx.currentTime`. */
  clock?: () => number;
  /** Voice numbers from the tuning drawer. They sit between the defaults and a step's own numbers. */
  tuning?: Tuning;
  /** Switch off pitch, level and filter variation (for measuring). On by default. */
  variation?: boolean;
  /** Start the chapter's beds when sound is enabled or the chapter changes. On by default. */
  beds?: boolean;
  /** Called once with the audio graph when nable() builds it. The sound lab uses it for its meter. */
  onChain?: (chain: Chain, ctx: BaseAudioContext) => void;
}

export interface PlayOptions {
  /** Seconds on the context's clock. The default is now. */
  at?: number;
}

export interface Audio {
  enable(): Promise<void>;
  disable(): Promise<void>;
  setChapter(id: ChapterId): void;
  setFocusState(state: FocusState): void;
  play(event: EventId, options?: PlayOptions): void;
  setMaster(db: number): void;
  onCaption(listener: (event: CaptionEvent) => void): () => void;
  state(): AudioState;
  dispose(): void;
}

function isOffline(ctx: BaseAudioContext): boolean {
  return typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
}

const FADE_OUT_SECONDS = 0.2;

export function createAudio(options: AudioOptions = {}): Audio {
  const rng: Rng = createRng(options.seed ?? 1);
  const listeners = new Set<(event: CaptionEvent) => void>();
  let mergeNowMs = 0;
  const merger = createCaptionMerger(() => mergeNowMs);

  let ctx: BaseAudioContext | null = null;
  let chain: Chain | null = null;
  let beds: Beds | null = null;
  let player: Player | null = null;
  let enabled = false;
  let chapter: ChapterId = 'porch';
  let focus: FocusState = 'lit';
  let masterDb = MASTER_DEFAULT_DB;

  const now = (): number => options.clock?.() ?? ctx?.currentTime ?? 0;

  function emit(event: CaptionEvent, at: number): void {
    mergeNowMs = at * 1000;
    const out = merger.offer(event);
    if (out) for (const listener of [...listeners]) listener(out);
  }

  function enterChapter(id: ChapterId, at: number): void {
    if (!ctx || !chain || !beds) return;
    const set = getSet(id);
    chain.room.setRoom(set.room, rng.fork(`room:${id}`));
    if (options.beds !== false) beds.setChapter(id, set, at);
  }

  function build(): void {
    const made = options.createContext ? options.createContext() : new AudioContext();
    ctx = made;
    chain = createChain(made);
    chain.setMaster(masterDb);
    options.onChain?.(chain, made);
    const tuning = options.tuning;
    beds = createBeds({
      ctx: made,
      chain,
      rng: rng.fork('beds'),
      ...(tuning ? { tuning } : {}),
      caption: (id, text, at) => emit({ id, text, quiet: false }, at),
    });
    player = createPlayer({
      ctx: made,
      chain,
      rng: rng.fork('play'),
      ...(tuning ? { tuning } : {}),
      variation: options.variation ?? true,
      caption: emit,
      onFocus: (state) => {
        focus = state;
      },
    });
  }

  return {
    async enable() {
      if (enabled) return;
      if (!ctx) build();
      if (!ctx || !chain) return;
      if (!isOffline(ctx) && ctx.state === 'suspended') await (ctx as AudioContext).resume();
      chain.master.gain.cancelScheduledValues(0);
      chain.setMaster(masterDb);
      enabled = true;
      enterChapter(chapter, now());
      if (focus === 'dim') {
        chain.closeFocus(now());
        chain.duckBeds(now(), 0.35);
      }
    },

    async disable() {
      if (!enabled || !ctx || !chain) return;
      enabled = false;
      if (isOffline(ctx)) return;
      const t = ctx.currentTime;
      chain.master.gain.cancelScheduledValues(t);
      chain.master.gain.setValueAtTime(chain.master.gain.value, t);
      chain.master.gain.linearRampToValueAtTime(0, t + FADE_OUT_SECONDS);
      if (ctx.state === 'running') {
        // A silent oscillator marks the end of the fade without a timer.
        const marker = ctx.createOscillator();
        const ended = new Promise<void>((done) => {
          marker.onended = () => done();
        });
        marker.start(t);
        marker.stop(t + FADE_OUT_SECONDS);
        await ended;
      }
      await (ctx as AudioContext).suspend();
    },

    setChapter(id) {
      if (!CHAPTER_IDS.includes(id)) return;
      chapter = id;
      if (enabled) enterChapter(id, now());
    },

    setFocusState(state) {
      focus = state;
      if (!enabled || !chain) return;
      const t = now();
      if (state === 'dim') {
        chain.closeFocus(t);
        chain.duckBeds(t, 0.35);
      } else {
        chain.openFocus(t);
        chain.restoreBeds(t, 0.5);
      }
    },

    play(event, playOptions) {
      if (!enabled || !player) return;
      player.play(getSet(chapter), event, playOptions?.at ?? now());
    },

    setMaster(db) {
      masterDb = clampMaster(db);
      if (enabled && chain) chain.setMaster(masterDb);
    },

    onCaption(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    state: () => ({ enabled, chapter, focus, masterDb, layers: beds?.layers() ?? [] }),

    dispose() {
      if (ctx && beds) beds.stopAll(now());
      chain?.dispose();
      if (ctx && !isOffline(ctx)) void (ctx as AudioContext).close();
      ctx = null;
      chain = null;
      beds = null;
      player = null;
      enabled = false;
      listeners.clear();
    },
  };
}
