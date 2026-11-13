# Kiro log

## 2026-11-13: rack focus spike

Built `spikes/rack-focus/` (CSS backdrop-filter and mask-image overlay that follows `document.activeElement`), `tests/e2e/rack-focus.spec.ts`, and set the Playwright config to port 5183 and local Chrome (Chromium on CI). Tab, scroll and 200%/400% zoom checks pass. Frame-time numbers under CPU throttling were noisy, so no tier decision rests on them yet. Details in `spikes/rack-focus/RESULTS.md`. `src/` and `.kiro/` were not touched.
