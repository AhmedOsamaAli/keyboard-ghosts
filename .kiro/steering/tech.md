---
inclusion: always
---
# Tech
TypeScript strict, Vite, Preact, plain CSS. Tests: Vitest + fast-check (properties), Playwright automated Tab tests (Chromium for everything; Firefox and WebKit for the shell and selected chapters). axe-core loads lazily. Hosting: GitHub Pages via GitHub Actions. Node 22.
Sound: real CC0 recordings plus code-made sound (Web Audio; Tone.js only if the audio-engine spec says so). Muted by default, always captioned.
Pure functions in src/engine: no DOM, no Date.now, no Math.random (use a seeded generator). Looks, sound sets, stories and Ghost Hunt skeletons are data with schemas and property tests. Three effect tiers (2 full, 1 CSS light only, 0 plain), all tested.
Keep dependencies minimal and ask before adding one. Allowed code licences: MIT, Apache-2.0, ISC, MPL-2.0 (axe-core is MPL-2.0, used unmodified). Allowed asset licences: CC0, public domain, original code; a font only under the SIL Open Font License. Every asset has an entry in assets/manifest.json with a saved proof file in assets/licences/; npm run check fails without it.
Budgets are measured first, then enforced: download size, time to first light on a slowed CPU, total audio.
Data: every data file has a zod schema (zod 4, MIT; the one approved runtime dependency besides Preact and axe-core), and types come from the schemas.
Tests: unit and property tests run in Node with no DOM emulation; anything that needs layout or focus is a Playwright test. No test that gates a merge asserts frame time or elapsed time: wait for a condition or step a manual clock. Benchmarks live in tools/bench and only print.
Style: Prettier (.prettierrc.json) formats on save and `npm run check` runs format:check. Run `npm run format` before finishing a task. Pin exact versions.
Ports: the dev server and Playwright use the port in E2E_PORT, else the first line of .local/e2e-port, else 5183. Never use 5173 (another project uses it). Never stop a process you did not start.
Specs: Quick Specs written from the briefs in docs/briefs/. No task is optional (no `*`), including property tests. Tasks that can run at the same time never edit the same file.
Style: small files, no `any`.
Commands: npm run dev | check (typecheck, lint, unit and property tests, asset check) | e2e (Playwright) | build.
