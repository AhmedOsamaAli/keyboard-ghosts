import {
  LIMITER_RATIO,
  LIMITER_THRESHOLD_DB,
  MASTER_DEFAULT_DB,
  clampMaster,
  dbToGain,
  softClipCurve,
} from '../db';
import {
  FOCUS_CLOSED_HZ,
  FOCUS_CLOSE_SECONDS,
  FOCUS_OPEN_HZ,
  FOCUS_OPEN_SECONDS,
  focusCurveSamples,
  focusFrequency,
} from '../focus-curve';
import { createSlotMixer, sumInputs, type SlotMixer } from './mixer';
import { createRoom, type Room } from './room';

/**
 * Web Audio's compressor always adds a make-up gain of (1 / g) ^ 0.6, where g is its gain for a 0 dBFS
 * input. With a -6 dB threshold and a ratio of 20, g is -5.7 dB, so the make-up gain is 3.42 dB. It is
 * cancelled right after the compressor so that the levels in the sound sets are the levels at the
 * output. B7 measures the result.
 */
export const COMPRESSOR_MAKEUP_DB =
  0.6 * -(LIMITER_THRESHOLD_DB - LIMITER_THRESHOLD_DB / LIMITER_RATIO);

/** Beds drop 6 dB when the light dies. The breath rises 8 dB. */
export const BEDS_DROP_DB = -6;
export const BREATH_REST_DB = -8;
const FOCUS_STEPS = 24;

export interface Chain {
  /** Beds go here. Ducked 6 dB while the light is dead. */
  bedsBus: GainNode;
  /** Ghost breath goes here. */
  breathBus: GainNode;
  /** Beds, one-shots and breath. Everything here passes the focus filter. */
  worldBus: GainNode;
  /** Stingers and the repair chime. They go around the focus filter. */
  stingerBus: GainNode;
  focusFilter: BiquadFilterNode;
  master: GainNode;
  room: Room;
  /** Slots for bed layers, one-shots on the world bus, breath and stingers. Use these, not the buses. */
  bedSlots: SlotMixer;
  worldSlots: SlotMixer;
  breathSlots: SlotMixer;
  stingerSlots: SlotMixer;
  /** The last node before the destination. Meters connect here. */
  output: AudioNode;
  setMaster(db: number): void;
  /** The focus filter frequency at context time `t`, from the glide the chain is running. */
  focusHzAt(t: number): number;
  closeFocus(at: number): void;
  openFocus(at: number): void;
  duckBeds(at: number, seconds: number): void;
  restoreBeds(at: number, seconds: number): void;
  /** Raises the breath bus from -8 dB to 0 dB over `seconds`. */
  riseBreath(at: number, seconds: number): void;
  dispose(): void;
}

export function createChain(ctx: BaseAudioContext): Chain {
  const bedsBus = ctx.createGain();
  const breathBus = ctx.createGain();
  const worldBus = ctx.createGain();
  const stingerBus = ctx.createGain();
  const focusFilter = ctx.createBiquadFilter();
  focusFilter.type = 'lowpass';
  focusFilter.Q.value = 0.707;
  focusFilter.frequency.value = FOCUS_OPEN_HZ;
  const mix = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = dbToGain(MASTER_DEFAULT_DB);
  const room = createRoom(ctx);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = LIMITER_THRESHOLD_DB;
  compressor.knee.value = 0;
  compressor.ratio.value = LIMITER_RATIO;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  const makeup = ctx.createGain();
  makeup.gain.value = dbToGain(-COMPRESSOR_MAKEUP_DB);
  const clipper = ctx.createWaveShaper();
  clipper.curve = softClipCurve() as Float32Array<ArrayBuffer>;
  clipper.oversample = '4x';

  // Every summing node has at most two inputs (see mixer.ts).
  const shots = ctx.createGain();
  const [toWorldBeds, toWorldBreath, toWorldShots] = sumInputs(ctx, worldBus, 3) as [
    GainNode,
    GainNode,
    GainNode,
  ];
  bedsBus.connect(toWorldBeds);
  breathBus.connect(toWorldBreath);
  shots.connect(toWorldShots);
  const [toMixWorld, toMixStinger, toMixRoom] = sumInputs(ctx, mix, 3) as [
    GainNode,
    GainNode,
    GainNode,
  ];
  worldBus.connect(focusFilter).connect(toMixWorld);
  focusFilter.connect(room.input);
  stingerBus.connect(toMixStinger);
  stingerBus.connect(room.input);
  room.output.connect(toMixRoom);
  const bedSlots = createSlotMixer(ctx, bedsBus, 8);
  const worldSlots = createSlotMixer(ctx, shots, 32);
  const breathSlots = createSlotMixer(ctx, breathBus, 8);
  const stingerSlots = createSlotMixer(ctx, stingerBus, 16);
  mix.connect(master).connect(compressor).connect(makeup).connect(clipper).connect(ctx.destination);

  let glide = { from: FOCUS_OPEN_HZ, to: FOCUS_OPEN_HZ, start: 0, duration: 0 };
  const focusHzAt = (t: number): number =>
    focusFrequency(glide.from, glide.to, glide.duration, t - glide.start);

  function startGlide(at: number, to: number, duration: number): void {
    const from = focusHzAt(at);
    glide = { from, to, start: at, duration };
    const param = focusFilter.frequency;
    param.cancelScheduledValues(at);
    param.setValueAtTime(from, at);
    const curve = focusCurveSamples(from, to, FOCUS_STEPS);
    for (let i = 1; i < curve.length; i++) {
      param.linearRampToValueAtTime(curve[i] as number, at + (i / (curve.length - 1)) * duration);
    }
  }

  function rampGain(param: AudioParam, at: number, to: number, seconds: number): void {
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
    param.linearRampToValueAtTime(to, at + seconds);
  }

  return {
    bedsBus,
    breathBus,
    worldBus,
    stingerBus,
    focusFilter,
    master,
    room,
    bedSlots,
    worldSlots,
    breathSlots,
    stingerSlots,
    output: clipper,
    setMaster(db) {
      master.gain.value = dbToGain(clampMaster(db));
    },
    focusHzAt,
    closeFocus: (at) => startGlide(at, FOCUS_CLOSED_HZ, FOCUS_CLOSE_SECONDS),
    openFocus: (at) => startGlide(at, FOCUS_OPEN_HZ, FOCUS_OPEN_SECONDS),
    duckBeds: (at, seconds) => rampGain(bedsBus.gain, at, dbToGain(BEDS_DROP_DB), seconds),
    restoreBeds: (at, seconds) => rampGain(bedsBus.gain, at, 1, seconds),
    riseBreath(at, seconds) {
      breathBus.gain.cancelScheduledValues(at);
      breathBus.gain.setValueAtTime(dbToGain(BREATH_REST_DB), at);
      breathBus.gain.linearRampToValueAtTime(1, at + seconds);
    },
    dispose() {
      room.dispose();
      clipper.disconnect();
    },
  };
}
