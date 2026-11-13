# Kiro log

## 2026-11-13: rack focus spike

Built `spikes/rack-focus/` (CSS backdrop-filter and mask-image overlay that follows `document.activeElement`), `tests/e2e/rack-focus.spec.ts`, and set the Playwright config to port 5183 and local Chrome (Chromium on CI). Tab, scroll and 200%/400% zoom checks pass. Frame-time numbers under CPU throttling were noisy, so no tier decision rests on them yet. Details in `spikes/rack-focus/RESULTS.md`. `src/` and `.kiro/` were not touched.

## 2026-11-13: rack focus spike, round 2

In spikes/rack-focus/: feathered gradient masks driven by CSS variables (no data URL per frame), a keyboard camera that glides focus toward the window centre in 260 ms, and a 1.5 s start-up probe that runs the real effect to pick the tier. Round 1 is kept as ound1.html/ound1.ts. Added ench.ts and shots.ts, 12 screenshots, new e2e checks, and a Round 2 section in RESULTS.md with 5 runs per cell in normal, --disable-gpu and CPU x4 modes. Round 2 looks better but did not beat round 1 in software rendering at tier 2; tier 1 is the safe default. Only spikes/rack-focus/, 	ests/e2e/rack-focus.spec.ts and this log were edited.
