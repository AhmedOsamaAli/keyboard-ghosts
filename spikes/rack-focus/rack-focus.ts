// Rack focus spike: a fixed overlay (CSS backdrop-filter + mask-image) whose lit hole follows document.activeElement.

export { };

type Rect = { x: number; y: number; w: number; h: number; r: number };

const PAD = 20;
const RADIUS_EXTRA = 12;
const GLIDE_MS = 260;
const OVERSHOOT_S = 1.285; // easeOutBack constant giving about 6% overshoot
const HALO = 140; // the far layer's hole is the near hole grown by this much
const SLOW_MS = 25;
const MEASURE_MS = 2000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const overlay = $('rf');
const near = overlay.querySelector('.near') as HTMLElement;
const far = overlay.querySelector('.far') as HTMLElement;
const roTier = $('ro-tier');
const roFrame = $('ro-frame');
const roHole = $('ro-hole');

// ---------- tier selection ----------
const params = new URLSearchParams(location.search);
const forced = params.get('tier');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let tier: 0 | 1 | 2 = forced === '0' ? 0 : forced === '1' ? 1 : 2;
const isForced = forced === '0' || forced === '1' || forced === '2';
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

// ---------- frame timing ----------
const frames: number[] = [];
let startupFrames: number[] = [];
const t0 = performance.now();
let startupDone = false;

function median(a: number[]): number {
  if (a.length === 0) return 0;
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

// ---------- hole geometry ----------
let target: Rect | null = null;
let delta: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
let shown: Rect | null = null;
let glideStart = 0;
let lastEl: Element | null = null;
let lastMaskKey = '';

function easeOutBack(p: number): number {
  const u = p - 1;
  return 1 + (OVERSHOOT_S + 1) * u * u * u + OVERSHOOT_S * u * u;
}

function cornerRadius(el: Element, rect: DOMRect): number {
  const raw = getComputedStyle(el).borderTopLeftRadius.split(' ')[0] ?? '0';
  const v = parseFloat(raw) || 0;
  return raw.endsWith('%') ? (v / 100) * rect.width : v;
}

function hasVisibleRing(el: Element): boolean {
  if (!el.matches(':focus-visible')) return false;
  const cs = getComputedStyle(el);
  const outlineOk =
    cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/(transparent|, 0\))$/.test(cs.outlineColor);
  return outlineOk || cs.boxShadow !== 'none';
}

function rrPath(x: number, y: number, w: number, h: number, r0: number): string {
  const r = Math.max(0, Math.min(r0, w / 2, h / 2));
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}` +
    `V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}` +
    `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`
  );
}

function maskUrl(W: number, H: number, hole: Rect, grow: number): string {
  const d = `M0 0H${W}V${H}H0Z` + rrPath(hole.x - grow, hole.y - grow, hole.w + 2 * grow, hole.h + 2 * grow, hole.r + grow);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path fill-rule="evenodd" d="${d}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function setMask(hole: Rect) {
  const W = innerWidth;
  const H = innerHeight;
  const key = [W, H, hole.x, hole.y, hole.w, hole.h, hole.r].map((n) => n.toFixed(1)).join(',');
  if (key === lastMaskKey) return;
  lastMaskKey = key;
  const n = maskUrl(W, H, hole, 0);
  const f = maskUrl(W, H, hole, HALO);
  near.style.maskImage = n;
  near.style.setProperty('-webkit-mask-image', n);
  far.style.maskImage = f;
  far.style.setProperty('-webkit-mask-image', f);
}

function frame(now: number) {
  requestAnimationFrame(frame);

  // frame timing
  if (lastFrameTs) {
    const dt = now - lastFrameTs;
    frames.push(dt);
    if (frames.length > 240) frames.shift();
    if (!startupDone) startupFrames.push(dt);
  }
  lastFrameTs = now;
  if (!startupDone && now - t0 >= MEASURE_MS) {
    startupDone = true;
    const m = median(startupFrames);
    startupFrames = [];
    if (!isForced && tier > 0 && !reducedQuery.matches && m > SLOW_MS) {
      tier = (tier - 1) as 0 | 1 | 2;
      tierNote = `auto, dropped (startup median ${m.toFixed(1)} ms)`;
      applyTier();
    }
  }

  if (tier === 0) {
    target = null;
    shown = null;
    return;
  }

  const el = document.activeElement;
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
  target = {
    x: rect.left - PAD,
    y: rect.top - PAD,
    w: rect.width + 2 * PAD,
    h: rect.height + 2 * PAD,
    r: cornerRadius(el, rect) + RADIUS_EXTRA,
  };

  if (el !== lastEl) {
    // glide from wherever the hole is now (if it exists) to the new element
    delta = shown
      ? { x: shown.x - target.x, y: shown.y - target.y, w: shown.w - target.w, h: shown.h - target.h, r: shown.r - target.r }
      : { x: 0, y: 0, w: 0, h: 0, r: 0 };
    glideStart = now;
    lastEl = el;
  }
  // the offset is relative to the live target, so scroll, zoom, resize and element growth are followed exactly
  const k = 1 - easeOutBack(Math.min(1, (now - glideStart) / GLIDE_MS));
  shown = {
    x: target.x + delta.x * k,
    y: target.y + delta.y * k,
    w: Math.max(0, target.w + delta.w * k),
    h: Math.max(0, target.h + delta.h * k),
    r: Math.max(0, target.r + delta.r * k),
  };
  setMask(shown);

  const drift = !hasVisibleRing(el);
  if (overlay.classList.contains('drift-on') !== drift) overlay.classList.toggle('drift-on', drift);
}
let lastFrameTs = 0;
requestAnimationFrame(frame);

// ---------- readout ----------
setInterval(() => {
  roTier.textContent = `tier: ${tier} (${tierNote})`;
  roFrame.textContent = `median frame: ${median(frames).toFixed(1)} ms`;
  roHole.textContent = shown
    ? `hole: x${shown.x.toFixed(0)} y${shown.y.toFixed(0)} ${shown.w.toFixed(0)}x${shown.h.toFixed(0)}`
    : 'hole: none';
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
  medianFrame: () => median(frames),
};
