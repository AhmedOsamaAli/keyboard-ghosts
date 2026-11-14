import type { Page } from '@playwright/test';

/** The browser suites load the engine through the dev server and analyse the buffers in the page. */
export const SAMPLE_RATE = 44100;
export const RENDER_SECONDS = 10;
export const CEILING_DB = -1;

const BASE = '/keyboard-ghosts/src';
export const URLS = {
  audio: `${BASE}/audio/index.ts`,
  analysis: `${BASE}/audio/analysis.ts`,
  engine: `${BASE}/engine/index.ts`,
  voices: `${BASE}/audio/voices/index.ts`,
  params: `${BASE}/audio/voices/params.ts`,
  chain: `${BASE}/audio/graph/chain.ts`,
  beds: `${BASE}/audio/graph/beds.ts`,
  sets: `${BASE}/audio/sets/index.ts`,
  db: `${BASE}/audio/db.ts`,
  noise: `${BASE}/audio/noise.ts`,
  levels: `${BASE}/audio/levels.ts`,
  schema: `${BASE}/audio/schema.ts`,
  impulse: `${BASE}/audio/impulse.ts`,
} as const;

export async function openPage(page: Page): Promise<void> {
  await page.goto('labs/sound/index.html');
  await page.waitForLoadState('domcontentloaded');
}

export interface VoiceReport {
  finite: boolean;
  peakDb: number;
  rmsDb: number;
  dc: number;
  /** Length until the loudness is 50 dB under its peak. */
  length50: number;
  /** Length until the loudness is 40 dB under its peak. */
  length40: number;
  centroid: number;
  peakTime: number;
  crestDb: number;
  modRate: number;
  /** Share of the spectrum power below 150 Hz and below 400 Hz. */
  low150: number;
  low400: number;
  /** Centroid of the last 0.4 s of the sound. */
  endCentroid: number;
  /** RMS (dB) of the first and the last 0.5 s of the sound. */
  rmsStart: number;
  rmsEnd: number;
  hash: string;
  /** For each wanted frequency, the strongest peak near it (null when there is none). */
  peaks: ({ freqHz: number; prominenceDb: number } | null)[];
}

export interface EngineRender {
  seconds: number;
  chapter?: string;
  plays?: { event: string; at: number }[];
  focus?: 'lit' | 'dim';
  master?: number;
  seed?: number;
  beds?: boolean;
  variation?: boolean;
  /** Windows (seconds) to measure: RMS, peak and the loudest 20 ms RMS. */
  windows?: { from: number; to: number }[];
}

export interface WindowReport {
  rmsDb: number;
  peakDb: number;
  maxRmsDb: number;
}

export interface EngineReport {
  hash: string;
  peakDb: number;
  finite: boolean;
  windows: WindowReport[];
  layers: string[];
}

/** Renders the real engine offline (enable, chapter, focus, plays) and measures the output. */
export async function renderEngine(page: Page, options: EngineRender): Promise<EngineReport> {
  return page.evaluate(
    async ({ options, urls, sr }) => {
      const m = (await import(
        /* @vite-ignore */ urls.audio
      )) as typeof import('../../../src/audio/index');
      const a = (await import(
        /* @vite-ignore */ urls.analysis
      )) as typeof import('../../../src/audio/analysis');
      const ctx = new OfflineAudioContext(1, Math.round(sr * options.seconds), sr);
      const audio = m.createAudio({
        seed: options.seed ?? 1,
        createContext: () => ctx,
        beds: options.beds ?? false,
        variation: options.variation ?? false,
      });
      if (options.master !== undefined) audio.setMaster(options.master);
      if (options.chapter)
        audio.setChapter(options.chapter as Parameters<typeof audio.setChapter>[0]);
      if (options.focus) audio.setFocusState(options.focus);
      await audio.enable();
      for (const p of options.plays ?? []) audio.play(p.event as never, { at: p.at });
      const layers = audio.state().layers;
      const x = (await ctx.startRendering()).getChannelData(0);
      const windows = (options.windows ?? []).map((w) => {
        const from = Math.round(w.from * sr);
        const to = Math.min(x.length, Math.round(w.to * sr));
        const part = x.slice(from, to);
        const env = a.rmsEnvelope(part, sr, 0.02).values;
        let max = 0;
        for (const v of env) max = Math.max(max, v);
        return {
          rmsDb: a.rmsDb(part),
          peakDb: a.peakDb(part),
          maxRmsDb: max > 0 ? 20 * Math.log10(max) : -Infinity,
        };
      });
      return {
        hash: a.hashSamples(x),
        peakDb: a.peakDb(x),
        finite: a.allFinite(x),
        windows,
        layers,
      };
    },
    { options, urls: URLS, sr: SAMPLE_RATE },
  );
}

export interface MeasureOptions {
  seed?: number;
  /** Numbers that replace the voice's defaults. */
  settings?: Record<string, number>;
  /** Frequencies to look for, and how wide to look (a fraction). */
  freqs?: number[];
  window?: number;
  /** Render as a bed with this loop length. */
  loopSeconds?: number;
}

/** Renders one voice alone, offline, straight to the output (no chain, no level), and measures it. */
export async function measureVoice(
  page: Page,
  voice: string,
  options: MeasureOptions = {},
): Promise<VoiceReport> {
  return page.evaluate(
    async ({ voice, options, urls, sr, seconds }) => {
      const voices = (await import(
        /* @vite-ignore */ urls.voices
      )) as typeof import('../../../src/audio/voices/index');
      const params = (await import(
        /* @vite-ignore */ urls.params
      )) as typeof import('../../../src/audio/voices/params');
      const engine = (await import(
        /* @vite-ignore */ urls.engine
      )) as typeof import('../../../src/engine/index');
      const a = (await import(
        /* @vite-ignore */ urls.analysis
      )) as typeof import('../../../src/audio/analysis');
      type Id = keyof typeof voices.VOICE_BUILDERS;
      const id = voice as Id;
      const ctx = new OfflineAudioContext(1, sr * seconds, sr);
      const settings = params.settingsFor(id, options.settings);
      voices.VOICE_BUILDERS[id](
        ctx,
        ctx.destination,
        0,
        settings,
        engine.createRng(options.seed ?? 1),
        options.loopSeconds,
      );
      const buffer = await ctx.startRendering();
      const x = buffer.getChannelData(0);
      const len50 = a.activeLength(x, sr, 50);
      const len40 = a.activeLength(x, sr, 40);
      const spec = a.spectrum(x, sr, 16384);
      let total = 0;
      let l150 = 0;
      let l400 = 0;
      for (let k = 0; k < spec.power.length; k++) {
        const p = spec.power[k] as number;
        total += p;
        if (k * spec.binHz < 150) l150 += p;
        if (k * spec.binHz < 400) l400 += p;
      }
      const endTo = Math.min(x.length, Math.round(len50 * sr));
      const endFrom = Math.max(0, endTo - Math.round(0.4 * sr));
      const endCentroid = a.centroid(a.spectrum(x.slice(endFrom, endTo), sr, 4096));
      const half = Math.round(0.5 * sr);
      const wanted = options.freqs ?? [];
      const big = a.spectrum(x, sr, 65536);
      return {
        finite: a.allFinite(x),
        peakDb: a.peakDb(x),
        rmsDb: a.rmsDb(x, 0, Math.max(1, endTo)),
        dc: a.dcOffset(x),
        length50: len50,
        length40: len40,
        centroid: a.centroid(spec),
        peakTime: a.peakTime(x, sr),
        crestDb: a.crestFactorDb(x),
        modRate: a.modulationRate(x.slice(0, Math.max(endTo, sr)), sr, 2, 40),
        low150: total > 0 ? l150 / total : 0,
        low400: total > 0 ? l400 / total : 0,
        endCentroid,
        rmsStart: a.rmsDb(x, 0, half),
        rmsEnd: a.rmsDb(x, Math.max(0, endTo - half), endTo),
        hash: a.hashSamples(x),
        peaks: wanted.map((hz) => a.peakNear(big, hz, options.window ?? 0.04)),
      };
    },
    { voice, options, urls: URLS, sr: SAMPLE_RATE, seconds: RENDER_SECONDS },
  );
}
