---
inclusion: always
---
# Tech
TypeScript strict, Vite, Preact, plain CSS. Tests: Vitest + fast-check (properties), Playwright automated Tab tests (Chromium for everything; Firefox and WebKit for the shell and selected chapters). axe-core loads lazily. Hosting: GitHub Pages via GitHub Actions. Node 22.
Sound: real CC0 recordings plus code-made sound (Web Audio; Tone.js only if the audio-engine spec says so). Muted by default, always captioned.
Pure functions in src/engine: no DOM, no Date.now, no Math.random (use a seeded generator). Looks, sound sets, stories and Ghost Hunt skeletons are data with schemas and property tests. Three effect tiers (2 full, 1 CSS light only, 0 plain), all tested.
Keep dependencies minimal and ask before adding one. Allowed code licences: MIT, Apache-2.0, ISC, MPL-2.0 (axe-core is MPL-2.0, used unmodified). Allowed asset licences: CC0, public domain, original code; a font only under the SIL Open Font License. Every asset has an entry in assets/manifest.json with a saved proof file in assets/licences/; npm run check fails without it.
Budgets are measured first, then enforced: download size, time to first light on a slowed CPU, total audio.
Style: small files, no `any`.
Commands: npm run dev | check (typecheck, lint, unit and property tests, asset check) | e2e (Playwright) | build.
