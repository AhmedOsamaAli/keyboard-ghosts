/**
 * Renders every voice offline in Chrome, writes WAV files to .local/sound/, a spectrogram per voice to
 * docs/evidence/sound/<voice>.png, and prints the measured numbers next to the targets.
 *
 *   node --experimental-strip-types tools/sound/render.ts
 *
 * It starts its own dev server on port 5185 and stops it (and the browser) even on failure. When the
 * port is busy it waits up to 60 seconds, then reports "port busy" and stops without killing anything.
 * The numbers are for people to read. Nothing here gates a merge.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const PORT = 5185;
const WAV_DIR = '.local/sound';
const PNG_DIR = 'docs/evidence/sound';

/** The targets from section 5 of the brief, as text for the table. */
const TARGETS: Record<string, string> = {
  tap: 'len <= 0.15 s; centroid 600-2500',
  chime: 'len 1.5-3 s; partials within 2%',
  'glass-ring': 'partials within 2%',
  'clock-chime': 'len 1.2-2.5 s',
  'church-bell': 'len 4-7 s; energy below 400 Hz',
  'clock-tick': 'len <= 0.04 s',
  breath: 'peak at 0.7-1.2 s; tonal end',
  whoosh: 'len 0.5-1.2 s',
  wind: 'centroid 250-1200',
  'wind-gaps': 'centroid 600-2000',
  'room-tone': 'centroid < 500',
  fire: 'crest >= 12 dB',
  'rain-roof': 'centroid 2500-6000',
  thunder: 'len 3-6 s; energy below 150 Hz',
  'floor-creak': 'len 0.4-1.5 s; AM 8-25 Hz',
  'door-creak': 'len 0.4-1.5 s; AM 8-25 Hz',
  'big-door': 'len 0.8-2 s',
  chains: 'centroid > 2000',
  bars: 'len 0.8-1.6 s; centroid > 1200',
  chord: 'len 1.5-3.5 s; 4:5:6 within 2%',
  murmur: 'centroid 400-1400; AM 2-6 Hz',
  drip: 'len <= 0.4 s',
  'music-box': 'len 0.6-1.5 s; partials within 3%',
  drone: 'centroid < 400; f0 near 55',
  riser: 'end >= start + 10 dB',
  heartbeat: 'energy below 150 Hz',
  'room-porch': 'decay 0.5 s +/- 25%',
  'room-foyer': 'decay 0.9 s +/- 25%',
  'room-chapel': 'decay 3.2 s +/- 25%',
  'room-gallery': 'decay 1.6 s +/- 25%',
  'room-library': 'decay 0.7 s +/- 25%',
  'room-attic': 'decay 1.2 s +/- 25%',
  'room-finale': 'decay 2.0 s +/- 25%',
};

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: 'localhost' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    if (!(await portInUse(PORT))) return true;
    await new Promise((done) => setTimeout(done, 5000));
  }
  return false;
}

interface Row {
  voice: string;
  seconds: number;
  peakDb: number;
  rmsDb: number;
  centroid: number;
  crestDb: number;
  modRate: number;
  wav: string;
  png: string;
}

async function main(): Promise<void> {
  if (!(await waitForPort())) {
    console.error(`port busy: ${PORT} is in use. Nothing was rendered and nothing was stopped.`);
    process.exitCode = 1;
    return;
  }
  const server = await createServer({
    server: { port: PORT, strictPort: true },
    logLevel: 'error',
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await server.listen();
    browser = await chromium.launch(process.env['CI'] ? {} : { channel: 'chrome' });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/keyboard-ghosts/labs/sound/index.html`);
    const rows: Row[] = await page.evaluate(async () => {
      const base = '/keyboard-ghosts/src';
      const voices = await import(/* @vite-ignore */ `${base}/audio/voices/index.ts`);
      const params = await import(/* @vite-ignore */ `${base}/audio/voices/params.ts`);
      const schema = await import(/* @vite-ignore */ `${base}/audio/schema.ts`);
      const engine = await import(/* @vite-ignore */ `${base}/engine/index.ts`);
      const a = await import(/* @vite-ignore */ `${base}/audio/analysis.ts`);
      const imp = await import(/* @vite-ignore */ `${base}/audio/impulse.ts`);
      const sr = 44100;
      const toBase64 = (bytes: Uint8Array): string => {
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return btoa(s);
      };
      const draw = (x: Float32Array, name: string): string => {
        const width = 900;
        const height = 320;
        const top = 24;
        const plot = height - top - 20;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const g = canvas.getContext('2d') as CanvasRenderingContext2D;
        g.fillStyle = '#000';
        g.fillRect(0, 0, width, height);
        const { frames, maxDb } = a.spectrogram(x, 2048, 256);
        const loHz = 30;
        const hiHz = 16000;
        const binHz = sr / 2048;
        for (let col = 0; col < width - 50; col++) {
          const f = frames[Math.floor((col / (width - 50)) * frames.length)];
          if (!f) continue;
          for (let row = 0; row < plot; row++) {
            const hz = loHz * (hiHz / loHz) ** (1 - row / plot);
            const db = (f[Math.min(f.length - 1, Math.round(hz / binHz))] ?? -200) - maxDb;
            const v = Math.max(0, Math.min(1, (db + 80) / 80));
            g.fillStyle = `rgb(${Math.round(255 * v)}, ${Math.round(200 * v ** 1.5)}, ${Math.round(90 * v ** 3)})`;
            g.fillRect(col + 50, row + top, 1, 1);
          }
        }
        g.fillStyle = '#fff';
        g.font = '14px sans-serif';
        g.fillText(
          `${name}: ${(x.length / sr).toFixed(2)} s, log frequency 30 Hz to 16 kHz, 80 dB range`,
          50,
          16,
        );
        for (const hz of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
          const row = plot * (1 - Math.log(hz / loHz) / Math.log(hiHz / loHz));
          g.fillText(hz >= 1000 ? `${hz / 1000}k` : String(hz), 4, row + top + 4);
        }
        return canvas.toDataURL('image/png').split(',')[1] ?? '';
      };
      const out = [];
      for (const voice of schema.VOICE_IDS) {
        const ctx = new OfflineAudioContext(1, sr * 10, sr);
        voices.VOICE_BUILDERS[voice](
          ctx,
          ctx.destination,
          0,
          params.settingsFor(voice),
          engine.createRng(1),
        );
        const full = (await ctx.startRendering()).getChannelData(0);
        const end = Math.min(full.length, Math.ceil((a.activeLength(full, sr, 60) + 0.25) * sr));
        const x = full.slice(0, end);
        out.push({
          voice,
          seconds: a.activeLength(full, sr, 50),
          peakDb: a.peakDb(x),
          rmsDb: a.rmsDb(x),
          centroid: a.centroid(a.spectrum(x, sr, 16384)),
          crestDb: a.crestFactorDb(x),
          modRate: a.modulationRate(x, sr, 2, 40),
          wav: toBase64(a.encodeWav(x, sr)),
          png: draw(x, voice),
        });
      }
      for (const [chapter, seconds] of Object.entries(imp.ROOM_SECONDS) as [string, number][]) {
        const x = imp.generateImpulse(seconds, sr, engine.createRng(1));
        out.push({
          voice: `room-${chapter}`,
          seconds: a.rt60(x, sr),
          peakDb: a.peakDb(x),
          rmsDb: a.rmsDb(x),
          centroid: a.centroid(a.spectrum(x, sr, 16384)),
          crestDb: a.crestFactorDb(x),
          modRate: 0,
          wav: toBase64(a.encodeWav(x, sr)),
          png: draw(x, `room ${chapter} (target ${seconds} s)`),
        });
      }
      return out;
    });
    mkdirSync(WAV_DIR, { recursive: true });
    mkdirSync(PNG_DIR, { recursive: true });
    const table: string[] = [];
    table.push(
      `${'voice'.padEnd(12)} ${'len s'.padStart(6)} ${'peak'.padStart(6)} ${'rms'.padStart(6)} ${'centroid'.padStart(8)} ${'crest'.padStart(6)} ${'AM Hz'.padStart(6)}  target`,
    );
    for (const r of rows) {
      writeFileSync(`${WAV_DIR}/${r.voice}.wav`, Buffer.from(r.wav, 'base64'));
      writeFileSync(`${PNG_DIR}/${r.voice}.png`, Buffer.from(r.png, 'base64'));
      table.push(
        `${r.voice.padEnd(12)} ${r.seconds.toFixed(2).padStart(6)} ${r.peakDb.toFixed(1).padStart(6)} ${r.rmsDb.toFixed(1).padStart(6)} ${r.centroid.toFixed(0).padStart(8)} ${r.crestDb.toFixed(1).padStart(6)} ${r.modRate.toFixed(1).padStart(6)}  ${TARGETS[r.voice] ?? ''}`,
      );
    }
    console.log(table.join('\n'));
    console.log(
      `\nWrote ${rows.length} WAV files to ${WAV_DIR}/ and ${rows.length} pictures to ${PNG_DIR}/.`,
    );
    console.log(
      'Lengths are to 50 dB under the peak. B2 checks the targets; this table only prints.',
    );
  } finally {
    await browser?.close();
    await server.close();
  }
}

await main();
