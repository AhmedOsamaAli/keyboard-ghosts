/** The sound lab. Dev server only. It never ships and nothing in src imports it. */
import { createAudio } from '../../src/audio/index';
import { CHAPTER_IDS, createRng, type ChapterId } from '../../src/engine/index';
import { createBeds, type Beds } from '../../src/audio/graph/beds';
import type { Chain } from '../../src/audio/graph/chain';
import { oneShotGainDb } from '../../src/audio/levels';
import { dbToGain, gainToDb } from '../../src/audio/db';
import { VOICE_IDS, type EventId, type VoiceId } from '../../src/audio/schema';
import { getSet } from '../../src/audio/sets/index';
import { settingsFor } from '../../src/audio/voices/params';
import { VOICE_BUILDERS } from '../../src/audio/voices/index';
import { mountTuning, tuningWanted, type TuningMap } from './tuning';

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`The lab page has no element ${id}`);
  return found as T;
}

const CAPTION_SECONDS = 2.5;
let context: BaseAudioContext | null = null;
let chain: Chain | null = null;
let analyser: AnalyserNode | null = null;
let beds: Beds | null = null;
let chapter: ChapterId = 'porch';
let holdPeak = 0;
let captionTimer = 0;

const tuning: TuningMap = tuningWanted(location.search)
  ? mountTuning(el('tuning'), (text) => (el('lab-status').textContent = text))
  : {};
if (tuningWanted(location.search)) el('tuning').hidden = false;

const audio = createAudio({
  seed: 7,
  beds: false,
  tuning,
  createContext: () => {
    const made = new AudioContext();
    context = made;
    return made;
  },
  onChain: (made, ctx) => {
    chain = made;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    made.output.connect(analyser);
  },
});

function showCaption(text: string): void {
  el('caption').textContent = text;
  window.clearTimeout(captionTimer);
  captionTimer = window.setTimeout(() => {
    el('caption').textContent = '\u00a0';
  }, CAPTION_SECONDS * 1000);
}

audio.onCaption((event) => showCaption(event.text));

function say(text: string): void {
  el('lab-status').textContent = text;
}

function needSound(): boolean {
  if (audio.state().enabled && context && chain) return true;
  say('Turn sound on first.');
  return false;
}

function renderFocus(): void {
  el('focus-state').textContent = `Light: ${audio.state().focus}`;
}

function renderBeds(): void {
  const layers = beds?.layers() ?? [];
  el('beds-state').textContent = layers.length
    ? `Playing: ${layers.join(', ')}.`
    : 'No beds are playing.';
}

function renderEvents(): void {
  const list = el('events');
  list.replaceChildren();
  for (const event of getSet(chapter).events) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Play ${event.id}`;
    button.addEventListener('click', () => {
      if (needSound()) audio.play(event.id as EventId);
    });
    const caption = document.createElement('span');
    caption.textContent = ` ${event.caption}`;
    item.append(button, caption);
    list.append(item);
  }
}

function renderVoices(): void {
  const list = el('voices');
  for (const voice of VOICE_IDS) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Play ${voice}`;
    const caption = `[${voice.replace(/-/g, ' ')} plays]`;
    button.addEventListener('click', () => playVoice(voice, caption));
    const text = document.createElement('span');
    text.textContent = ` ${caption}`;
    item.append(button, text);
    list.append(item);
  }
}

let voiceCount = 0;
function playVoice(voice: VoiceId, caption: string): void {
  if (!needSound() || !context || !chain) return;
  const gain = context.createGain();
  gain.gain.value = dbToGain(oneShotGainDb(-12));
  const rng = createRng(100 + voiceCount++);
  const now = context.currentTime;
  const handle = VOICE_BUILDERS[voice](
    context,
    gain,
    now,
    settingsFor(voice, undefined, tuning),
    rng,
  );
  chain.worldSlots.add(gain, now, now + handle.duration + 0.1);
  showCaption(caption);
}

function ensureBeds(): Beds | null {
  if (!needSound() || !context || !chain) return null;
  beds ??= createBeds({
    ctx: context,
    chain,
    rng: createRng(3),
    tuning,
    caption: (_id, text) => showCaption(text),
  });
  return beds;
}

el('sound-toggle').addEventListener('click', async () => {
  if (audio.state().enabled) {
    await audio.disable();
    el('sound-toggle').textContent = 'Turn sound on';
    el('sound-state').textContent = 'Sound is off.';
  } else {
    await audio.enable();
    el('sound-toggle').textContent = 'Turn sound off';
    el('sound-state').textContent = 'Sound is on.';
  }
});

const master = el<HTMLInputElement>('master');
master.addEventListener('input', () => {
  audio.setMaster(Number(master.value));
  el('master-value').textContent = `${master.value} dB`;
});

const picker = el<HTMLSelectElement>('chapter');
for (const id of CHAPTER_IDS) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = id;
  picker.append(option);
}
picker.addEventListener('change', () => {
  chapter = picker.value as ChapterId;
  audio.setChapter(chapter);
  beds?.stopAll(context?.currentTime ?? 0);
  renderBeds();
  renderEvents();
});

el('beds-start').addEventListener('click', () => {
  const b = ensureBeds();
  if (b && context) {
    b.setChapter(chapter, getSet(chapter), context.currentTime);
    renderBeds();
  }
});
el('beds-stop').addEventListener('click', () => {
  if (beds && context) beds.stopAll(context.currentTime);
  renderBeds();
});

el('break').addEventListener('click', () => {
  if (!needSound()) return;
  audio.setFocusState('dim');
  audio.play('light-dies');
  renderFocus();
});
el('restore').addEventListener('click', () => {
  if (!needSound()) return;
  audio.setFocusState('lit');
  audio.play('repair');
  renderFocus();
});

// The player's own Tab key plays a tick. Nothing here simulates a key.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') audio.play('tab-tick');
});

// The peak meter is text. It updates a few times a second, and it is not a live region.
let lastMeter = 0;
function meter(time: number): void {
  if (analyser && time - lastMeter > 250) {
    lastMeter = time;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v));
    holdPeak = Math.max(peak, holdPeak * 0.9);
    const db = gainToDb(holdPeak);
    el('meter').textContent = Number.isFinite(db) ? `${db.toFixed(1)} dBFS` : '-inf dBFS';
  }
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

renderEvents();
renderVoices();
renderBeds();
renderFocus();
