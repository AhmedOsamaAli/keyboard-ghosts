/** The tuning drawer. Dev server only, and only with ?tune=1. Never part of a production build. */
import { VOICE_IDS, type VoiceId } from '../../src/audio/schema';
import { VOICE_DEFAULTS } from '../../src/audio/voices/params';

const STORAGE_KEY = 'kg-sound-tune';

export type TuningMap = Partial<Record<VoiceId, Record<string, number>>>;

export function tuningWanted(search: string): boolean {
  return new URLSearchParams(search).get('tune') === '1';
}

function load(): TuningMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TuningMap) : {};
  } catch {
    return {};
  }
}

function save(map: TuningMap): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function range(value: number): { min: number; max: number; step: number } {
  if (value === 0) return { min: -1, max: 1, step: 0.01 };
  const a = Math.abs(value);
  const step = a >= 100 ? 1 : a >= 10 ? 0.1 : 0.01;
  return value > 0
    ? { min: 0, max: Math.max(a * 3, step * 10), step }
    : { min: -a * 3, max: 0, step };
}

/** The merged defaults and tuning, as JSON the owner can paste back to Kiro. */
export function soundJson(map: TuningMap): string {
  const out: Record<string, Record<string, number>> = {};
  for (const id of VOICE_IDS) out[id] = { ...VOICE_DEFAULTS[id], ...(map[id] ?? {}) };
  return JSON.stringify(out, null, 2);
}

/**
 * Builds the drawer into `host`. The returned object is the live tuning map: the engine reads it
 * each time it builds a voice, so a slider change is heard on the next play.
 */
export function mountTuning(host: HTMLElement, onStatus: (text: string) => void): TuningMap {
  const map = load();
  const heading = document.createElement('h2');
  heading.textContent = 'Tuning drawer';
  host.append(heading);
  const note = document.createElement('p');
  note.textContent =
    'Move a slider, press Play on the voice, and listen. Copy sound JSON when it sounds right.';
  host.append(note);

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy sound JSON';
  copy.addEventListener('click', () => {
    navigator.clipboard.writeText(soundJson(map)).then(
      () => onStatus('Sound JSON copied.'),
      () => onStatus('Could not copy. Select and copy the text in the box below.'),
    );
    box.value = soundJson(map);
  });
  host.append(copy);

  for (const id of VOICE_IDS) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = id;
    details.append(summary);
    for (const [key, base] of Object.entries(VOICE_DEFAULTS[id])) {
      const row = document.createElement('div');
      row.className = 'tune-row';
      const inputId = `tune-${id}-${key}`;
      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.textContent = key;
      const input = document.createElement('input');
      input.type = 'range';
      input.id = inputId;
      const r = range(base);
      input.min = String(r.min);
      input.max = String(r.max);
      input.step = String(r.step);
      const start = map[id]?.[key] ?? base;
      input.value = String(start);
      const value = document.createElement('span');
      value.textContent = String(start);
      input.addEventListener('input', () => {
        const n = Number(input.value);
        value.textContent = String(n);
        (map[id] ??= {})[key] = n;
        save(map);
      });
      row.append(label, input, value);
      details.append(row);
    }
    host.append(details);
  }

  const boxLabel = document.createElement('label');
  boxLabel.htmlFor = 'tune-json';
  boxLabel.textContent = 'Sound JSON';
  const box = document.createElement('textarea');
  box.id = 'tune-json';
  box.rows = 6;
  box.readOnly = true;
  host.append(boxLabel, box);
  return map;
}
