// Rack focus spike, round 2: a fixed overlay of feathered, masked layers whose lit core follows document.activeElement.
// The masks are static CSS gradients positioned by four CSS variables, so a move is four setProperty calls, not a new image.

export { };

type Rect = { x: number; y: number; w: number; h: number };
type Tier = 0 | 1 | 2;

const PAD = 20;
const GLIDE_MS = 260;
const OVERSHOOT_S = 1.285; // easeOutBack constant giving about 6% overshoot
const CAMERA_MS = 260;
const PROBE_MS = 1500;
const PROBE_STEP_MS = 200;
const PROBE_COUNT = 6;
const PROBE_MEDIAN_MAX = 20;
const PROBE_P95_MAX = 40;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const overlay = $('rf');
const roTier = $('ro-tier');
const roFrame = $('ro-frame');
const roHole = $('ro-hole');
const roProbe = $('ro-probe');

// ---------- tier selection ----------
const params = new URLSearchParams(location.search);
const forced = params.get('tier');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const isForced = forced === '0' || forced === '1' || forced === '2';
let tier: Tier = forced === '0' ? 0 : forced === '1' ? 1 : 2;
let tierNote = isForced ? 'forced' : 'auto';

function applyTier() {
  if (reducedQuery.matches) {
    tier = 0;
    tierNote = 'reduced-motion';
  }
  overlay.classList.remove('tier-0', 'tier-1', 'tier-2');
  overlay.classList.add(`tier-${tier}`);
}
reducedQuery.addEventListener('change', applyTier);
applyTier();

// ---------- statistics ----------
function sorted(a: number[]): number[] {
  return [...a].sort((p, q) => p - q);
}
function median(a: number[]): number {
  if (a.length === 0) return 0;
  const s = sorted(a);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}
function percentile(a: number[], p: number): number {
  if (a.length === 0) return 0;
  const s = sorted(a);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] as number;
}

// ---------- the startup probe ----------
// Runs the real effect for 1.5 s: the lit area jumps to 6 different elements, one every 200 ms, and frame times are recorded.
const probe = {
  state: (isForced || reducedQuery.matches ? 'skipped' : 'waiting') as 'skipped' | 'waiting' | 'running' | 'done',
  start: 0,
  els: [] as HTMLElement[],
  frames: [] as number[],
  median: 0,
  p95: 0,
  dropped: false,
  el: null as HTMLElement | null,
};

function pickProbeElements(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input')).filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && e.closest('#readout') === null;
  });
  // spread the picks over everything that is on screen so the lit area really travels
  const n = Math.min(PROBE_COUNT, all.length);
  return Array.from({ length: n }, (_, i) => all[Math.floor((i * all.length) / n)] as HTMLElement);
}

function stepProbe(now: number) {
  if (probe.state === 'waiting' && document.readyState === 'complete') {
    probe.els = pickProbeElements();
    if (probe.els.length === 0) {
      probe.state = 'skipped';
      return;
    }
    probe.state = 'running';
    probe.start = now;
  }
  if (probe.state !== 'running') return;
  const t = now - probe.start;
  if (t < PROBE_MS) {
    probe.el = probe.els[Math.min(probe.els.length - 1, Math.floor(t / PROBE_STEP_MS))] ?? null;
    return;
  }
  probe.el = null;
  probe.state = 'done';
  probe.median = median(probe.frames);
  probe.p95 = percentile(probe.frames, 0.95);
  if (tier > 0 && (probe.median > PROBE_MEDIAN_MAX || probe.p95 > PROBE_P95_MAX)) {
    tier = (tier - 1) as Tier;
    probe.dropped = true;
    tierNote = 'auto, dropped by probe';
    applyTier();
  } else {
    tierNote = 'auto, kept by probe';
  }
}

function probeText(): string {
  if (probe.state === 'skipped') return `probe: skipped (${isForced ? 'forced tier' : reducedQuery.matches ? 'reduced motion' : 'nothing to probe'})`;
  if (probe.state !== 'done') return `probe: ${probe.state}`;
  return `probe: median ${probe.median.toFixed(1)} ms, p95 ${percentile(probe.frames, 0.95).toFixed(1)} ms, ${probe.dropped ? `dropped to tier ${tier}` : `kept tier ${tier}`}`;
}

// ---------- camera: glide the focused element toward the vertical centre ----------
let keyboard = false;
let pendingCamera: Element | null = null;
let camera: { from: number; to: number; t0: number } | null = null;

addEventListener('keydown', () => (keyboard = true), true);
addEventListener('pointerdown', () => (keyboard = false), true);
for (const type of ['wheel', 'touchstart'] as const) addEventListener(type, () => (camera = null), { capture: true, passive: true });
document.addEventListener('focusin', (e) => {
  // keyboard moves only; the browser's own focus scroll runs after the event, so the work is deferred to the next frame
  if (keyboard && tier > 0 && !reducedQuery.matches) pendingCamera = e.target as Element;
});

function startCamera(el: Element, now: number) {
  const r = el.getBoundingClientRect();
  const mid = r.top + r.height / 2;
  if (mid >= innerHeight / 3 && mid <= (2 * innerHeight) / 3) return; // already in the middle third
  const max = document.documentElement.scrollHeight - innerHeight;
  const to = Math.max(0, Math.min(max, scrollY + mid - innerHeight / 2));
  if (Math.abs(to - scrollY) < 1) return;
  camera = { from: scrollY, to, t0: now };
}

function stepCamera(now: number) {
  if (pendingCamera) {
    if (pendingCamera === document.activeElement) startCamera(pendingCamera, now);
    pendingCamera = null;
  }
  if (!camera) return;
  const p = Math.min(1, (now - camera.t0) / CAMERA_MS);
  const eased = 1 - (1 - p) ** 3;
  scrollTo({ top: camera.from + (camera.to - camera.from) * eased, behavior: 'instant' });
  if (p >= 1) camera = null;
}

// ---------- lit core ----------
let target: Rect | null = null;
let delta: Rect = { x: 0, y: 0, w: 0, h: 0 };
let shown: Rect | null = null; // the snapped core that is actually applied
let glideStart = 0;
let lastEl: Element | null = null;
let applied = '';
let writes = 0;

function easeOutBack(p: number): number {
  const u = p - 1;
  return 1 + (OVERSHOOT_S + 1) * u * u * u + OVERSHOOT_S * u * u;
}

function hasVisibleRing(el: Element): boolean {
  if (!el.matches(':focus-visible')) return false;
  const cs = getComputedStyle(el);
  const outlineOk =
    cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/(transparent|, 0\))$/.test(cs.outlineColor);
  return outlineOk || cs.boxShadow !== 'none';
}

/** Whole CSS pixels, only ever growing the core: the mask regions then share pixel-aligned borders (no seams). */
function apply(r: Rect) {
  const x0 = Math.floor(r.x);
  const y0 = Math.floor(r.y);
  const x1 = Math.ceil(r.x + r.w);
  const y1 = Math.ceil(r.y + r.h);
  shown = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const key = `${x0},${y0},${x1 - x0},${y1 - y0}`;
  if (key === applied) return; // the lit area has not moved: no style writes at all
  applied = key;
  writes++;
  const s = overlay.style;
  s.setProperty('--cx', `${x0}px`);
  s.setProperty('--cy', `${y0}px`);
  s.setProperty('--cw', `${x1 - x0}px`);
  s.setProperty('--ch', `${y1 - y0}px`);
}

let lastFrameTs = 0;
const frames: number[] = [];

function frame(now: number) {
  requestAnimationFrame(frame);

  if (lastFrameTs) {
    const dt = now - lastFrameTs;
    frames.push(dt);
    if (frames.length > 240) frames.shift();
    if (probe.state === 'running') probe.frames.push(dt);
  }
  lastFrameTs = now;
  stepProbe(now);

  if (tier === 0) {
    target = null;
    shown = null;
    return;
  }

  stepCamera(now); // scroll first, so the rect read below already includes this frame's camera move

  const el = probe.el ?? document.activeElement;
  if (!el || el === document.body || el === document.documentElement) {
    overlay.classList.add('idle');
    overlay.classList.remove('drift-on');
    lastEl = null;
    shown = null;
    target = null;
    return;
  }
  overlay.classList.remove('idle');

  const rect = el.getBoundingClientRect();
  target = { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + 2 * PAD, h: rect.height + 2 * PAD };

  if (el !== lastEl) {
    // glide from wherever the core is now (if it exists) to the new element
    delta = shown
      ? { x: shown.x - target.x, y: shown.y - target.y, w: shown.w - target.w, h: shown.h - target.h }
      : { x: 0, y: 0, w: 0, h: 0 };
    glideStart = now;
    lastEl = el;
  }
  // the offset is relative to the live target, so scroll, camera, zoom, resize and element growth are followed exactly
  const k = 1 - easeOutBack(Math.min(1, (now - glideStart) / GLIDE_MS));
  apply({
    x: target.x + delta.x * k,
    y: target.y + delta.y * k,
    w: Math.max(0, target.w + delta.w * k),
    h: Math.max(0, target.h + delta.h * k),
  });

  const drift = probe.el === null && !hasVisibleRing(el);
  if (overlay.classList.contains('drift-on') !== drift) overlay.classList.toggle('drift-on', drift);
}
requestAnimationFrame(frame);

// ---------- readout ----------
setInterval(() => {
  roTier.textContent = `tier: ${tier} (${tierNote})`;
  roFrame.textContent = `median frame: ${median(frames).toFixed(1)} ms`;
  roHole.textContent = shown ? `hole: x${shown.x} y${shown.y} ${shown.w}x${shown.h}` : 'hole: none';
  roProbe.textContent = probeText();
}, 250);

$('break-ring').addEventListener('click', () => {
  const b = $('ring-test');
  const broken = b.style.outline === 'none';
  b.style.outline = broken ? '' : 'none';
  b.style.boxShadow = broken ? '' : 'none';
});

// ---------- test hooks ----------
(window as unknown as { __rack: unknown }).__rack = {
  get tier() {
    return tier;
  },
  get hole() {
    return shown ? { ...shown } : null;
  },
  get driftOn() {
    return overlay.classList.contains('drift-on');
  },
  get writes() {
    return writes;
  },
  get probe() {
    return { state: probe.state, median: probe.median, p95: probe.p95, dropped: probe.dropped, frames: probe.frames.length };
  },
  get readoutProbe() {
    return roProbe.textContent;
  },
  medianFrame: () => median(frames),
};
