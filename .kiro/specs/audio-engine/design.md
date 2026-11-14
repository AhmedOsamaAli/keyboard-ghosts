# Design: audio-engine

Brief: [docs/briefs/audio-engine.md](../../../docs/briefs/audio-engine.md). The brief wins over this file. Where this file differs from the brief, the difference is listed under "Differences from the brief" below. Related: `.kiro/steering/sound-bible.md`, `.kiro/steering/a11y-principles.md`, [docs/decisions.md](../../../docs/decisions.md) (D2 zod data, D3 Node versus browser, D4 no timing assertions).

## Overview

The engine is a Web Audio graph built only inside `enable()`. Voices are code-made recipes whose numbers come from data. A focus filter on the world bus makes the sound go out of focus with the picture. A limiter keeps every output under -1 dBFS. Pure modules (mix math, captions, focus curve, noise, set data, loader plan) run in Node. Graphs are rendered with `OfflineAudioContext` in Chrome and analysed in the page.

## Module layout (`src/audio/`)

| File | Role | Tested in |
|---|---|---|
| `index.ts` | The only public entry: `createAudio`, `nullAudio`, types | e2e |
| `db.ts` | `dbToGain`, `gainToDb`, ceiling constants, soft-clip curve, `limiterModel` | Node |
| `variation.ts` | Seeded pitch, level and filter variation | Node |
| `captions.ts` | Caption rules, `createCaptionMerger(clock)` | Node |
| `focus-curve.ts` | `focusFrequency`, `focusCurveSamples` | Node |
| `noise.ts` | Seeded white, pink and brown noise buffers (`Float32Array`) | Node |
| `impulse.ts` | Generated room impulse (decaying noise, early reflections, closing low-pass) | Node |
| `analysis.ts` | Peak, RMS, DC, FFT, centroid, partial peaks, decay time, modulation rate, crest factor | Node and page |
| `schema.ts` | zod schemas and types for voice settings, beds, events, sets, caption events | Node |
| `loader.ts` | `loaderPlan(chapter, enabled, sets)` and `loadSamples(plan, fetchFn)` | Node |
| `sets/<chapter>.json`, `sets/index.ts` | Sound-set data and a parsed lookup | Node |
| `voices/defaults.json`, `voices/params.ts` | Default numbers for every voice, merged with per-use `params` | Node |
| `voices/*.ts` | One build function per voice group, `voices/index.ts` is the registry | Chrome |
| `graph/chain.ts`, `graph/room.ts` | Master chain, buses, focus filter, room send | Chrome |
| `graph/play.ts`, `graph/beds.ts`, `audio.ts`, `null.ts` | Event scheduling, bed layers, `createAudio`, `nullAudio` | Chrome |

Other files: `labs/sound/**`, `tools/sound/render.ts`, `tests/**/audio/**`, `docs/architecture/audio.md`.

## Signal graph

```
 beds ──► bedsBus (gain, drops 6 dB when dim) ─┐
 one-shots ─────────────────────────────────────┼─► worldBus ─► focusFilter (low-pass 9000 → 350 Hz) ─┐
 ghost breath ─► breathBus (rises 8 dB) ────────┘                                                      │
                                                                                                       ▼
 stingers, repair chime ─► stingerBus (no filter) ─────────────────────────────────────────────► mix ─► master gain (-6 dB)
                                                                                                       │
 room send: worldBus (after focus filter) and stingerBus ─► ConvolverNode (generated impulse) ─► wet ──┘
                                                                                                       ▼
                       DynamicsCompressor (-6 dB, knee 0, 20:1, 3 ms, 120 ms) ─► WaveShaper (tanh, ceiling 0.891) ─► destination
```

- `worldBus` and `stingerBus` are `GainNode`s. Only `worldBus` feeds the focus filter.
- The room send is taken after the focus filter for the world bus, so a dim room stays dull, and straight from the stinger bus, so the chime keeps its air.
- The soft clipper curve is `y = ceiling * tanh(k x) / tanh(k)` for x in [-1, 1], with k solved once so the slope at 0 is 1. Then curve(1) equals the ceiling exactly, any input beyond 1 clamps to the ceiling, and quiet signals pass unchanged. `oversample` is `4x` so inter-sample peaks stay under the ceiling.
- `limiterModel(peak)` in `db.ts` is the pure copy of this: compressor ratio above the threshold, then the same curve. A2 tests it, and B4 tests the real graph.

## Focus filter

`focusFrequency(from, to, duration, t)` interpolates on a log-frequency axis and clamps `t` to [0, duration]. It returns `from` at 0 and `to` at `duration` exactly. `focusCurveSamples` returns 64 points that the graph passes to `setValueCurveAtTime`, so the node follows the tested function. Close: 9,000 to 350 Hz over 0.35 s. Open: 350 to 9,000 Hz over 0.12 s. A new glide starts from the frequency the function gives for the glide in progress, which the engine tracks itself because it cannot read the node.

`light-dies` runs these actions on one timeline from `at`: filter closes (0 to 0.35 s), `bedsBus` ramps down 6 dB, near silence until 0.4 s, then the `breath` step starts and the `breathBus` gain ramps up 8 dB (from -8 dB to 0 dB) over the breath's swell. `repair` opens the filter in 0.12 s, restores the beds, and plays the repair stinger on `stingerBus`. `setFocusState` runs the close or open glide without playing a sound.

## How each voice recipe is parameterised

Every voice has a flat record of named numbers in `src/audio/voices/defaults.json` (zod: `Record<voice, Record<string, number>>`, with a required key list per voice in `voices/params.ts`). A bed layer or an event step may carry `params`, a partial record of overrides. The effective settings are `{ ...defaults[voice], ...step.params }`. A voice build function is `(ctx, out, at, settings, rng) => { duration }`. It reads no other numbers.

| Voice | Named settings (examples, all numbers) |
|---|---|
| `tap` | `burstMs` 50, `bandHz` 1300, `bandQ` 5, `sineFromHz` 180, `sineToHz` 90, `sineMs` 60 |
| `chime`, `glass-ring`, `clock-chime`, `church-bell` | `fundamentalHz`, `tailS`, `ratioN` and `levelN` for each partial (N from 1), `fadeExponent` (fade = tail / ratio ^ exponent, exponent 1 for `chime`) |
| `music-box` | `fundamentalHz` 784, `ratio2` 6.27, `ratio3` 17.55, `decay1` 0.9, `decay2` 0.3, `decay3` 0.1 |
| `clock-tick` | `clickMs`, `highpassHz`, `dropCents` |
| `breath` | `lowHz` 500, `highHz` 3000, `swellS` 1.0, `thinS`, `toneHz` 300 |
| `whoosh` | `fromHz` 400, `toHz` 2400, `sweepS` 0.7 |
| `wind`, `wind-gaps` | `centreLowHz`, `centreHighHz`, `driftHz`, `q`, `levelDrift`, `whistleHz`, `whistleQ` |
| `room-tone` | `lowpassHz` |
| `fire` | `rumbleHz`, `crackleRate`, `crackleLevel` |
| `rain-roof` | `lowHz`, `highHz` |
| `thunder` | `lowHz`, `highHz`, `decayS` |
| `floor-creak`, `door-creak` | `pitchLowHz` 120, `pitchHighHz` 400, `q`, `slipHz` (8 to 25), `slipDepth`, `durationS`. The foyer door uses a lower pitch range and the attic hinge a higher, thinner one, both through `params` |
| `big-door` | `thudHz` 60, `thudS` 0.3, then the creak settings |
| `chains` | `burstCount`, `partialLowHz`, `partialHighHz`, `spacingS` (seeded) |
| `bars` | `scrapeFromHz` 1000, `scrapeToHz` 3000, `scrapeS` 0.6, `clankHz1` 1100, `clankHz2` 2700, `clankS` 0.4 |
| `chord` | `rootHz`, `attackS` 0.15, `tailS` 2, `rise` (0 or 1: slide each note up a whole tone over 2 s) |
| `murmur` | `formantLowHz` 500, `formantHighHz` 1500, `swellHz` (3 to 5) |
| `drip` | `fromHz` 800, `toHz` 1600, `riseMs` 40, `decayMs`, `tailLevel` |
| `drone` | `rootHz` 55, `detuneCents`, `lowpassHz`, `lowpassDriftHz` |
| `riser` | `noiseLevel`, `sineFromHz` 200, `sineToHz` 1600, `riseS` 4 |
| `heartbeat` | `thumpHz1` 60, `thumpHz2` 50, `gapS` 0.28, `repeatS` |
| `room` | not a voice node: `generateImpulse(seconds, rng)` with `earlyCount`, `lowpassFromHz`, `lowpassToHz` |

Every voice also has `trimDb`, a calibration number that brings the voice to the reference peak (see Levels). Voices that run without a drifting or random part use no generator; voices with random parts take their random numbers from the injected `rng` fork named after the voice, so adding a voice does not change another voice's numbers.

## Levels

- A voice aims at a reference peak of -3 dBFS at its own output (B1, B2 measure it there). A set's `levelDb` is the peak (RMS for beds) at the final output with the master at -6 dB and variation off. The engine therefore applies a gain of `levelDb + 9` dB for one-shots and stingers (reference -3 plus master -6).
- `trimDb` values are first-guess numbers. B7 and the render table show the error, and the browser tasks adjust `trimDb` and set levels inside the brief's tolerances.
- Reference levels for the sets: one-shots -12 dB, `tab-tick` -26 dB, stingers -9 dB, beds around -33 to -36 dB each so that two or three layers together measure -30 dB RMS.

## Beds

A bed layer renders its voice into a looping noise or oscillator source whose loop length is the layer's `loopSeconds`. Every drifting modulator has a period that divides the loop length, so the loop joins without a click. Two layers with different lengths (for example 47 s and 61 s) make the combined pattern repeat only after their least common multiple. Fades are `fadeIn` and `fadeOut` seconds on a per-layer gain. `setChapter` fades the old chapter's layers out and the new chapter's layers in over 3 s together (the cross-fade). Each layer raises its caption once when it starts.

## Captions

`captions.ts` exports `isValidCaption(text)` and `createCaptionMerger(clock)`. The merger keeps the last emission time per text and returns the event or `null`. The engine calls it with the time of the `play` call (`at` if given, else the clock). The default clock is the context's `currentTime` in milliseconds. A caption event is `{ id, text, quiet }`. The engine does not touch the DOM.

## Loader plan

`loaderPlan(chapter, enabled, sets)` returns `[]` when `enabled` is false. Otherwise it returns the sample ids named by that chapter's set and by the shared list (none today). Since every `sample` is `null`, the plan is empty in production; tests use fixture sets. `loadSamples(plan, fetchFn)` takes `fetch` as an argument.

## Testing approach

- Property predicates are written as functions that take the implementation under test (for example `limiterCeilingHolds(limiter)`), so the real property test passes the real code and each mutant passes a broken copy.
- The browser suites run in Playwright with Chrome. They `import('/keyboard-ghosts/src/audio/index.ts')` inside `page.evaluate`, render offline, analyse in the page with `analysis.ts` and return numbers only. No audio data crosses the page boundary except hashes.
- Determinism (B5) compares a hash of each rendered buffer.
- The production-build test runs Vite's build API in Node on `tests/fixtures/audio/build-entry.ts` (imports all of `src/audio`) and searches the output for `labs/sound`, `tune=1`, `Copy sound JSON`, `__sound` and `sessionStorage` keys of the drawer. It starts no browser and no server.

## Correctness Properties

Node (fast-check, at least 200 runs, `tests/property/audio/`, using `tests/property/fc-config.ts`):

- A1 Variation: for any seed and base values, pitch stays within 50 cents, level within 2 dB, filter within 8%; the same seed gives the same variation.
- A2 Mix: dB to gain and back round-trips; the limiter model never outputs above the ceiling for any list of input peaks.
- A3 Captions: for any event sequence with times, the merger never emits two identical captions within 400 ms and never drops a distinct caption; every caption obeys the caption rules.
- A4 Coverage: the test holds its own copy of the section 6 tables. Every event and every bed layer of every sound set has exactly one caption and a recipe; every caption maps to an event or a bed layer; each set holds exactly the seven global events plus the chapter events the table gives it, and no other; every `needsSample` entry matches the table.
- A5 Sound-set data: every file parses; levels, loop lengths and fades are inside their ranges; a chapter has at least two bed layers; two bed layers never share a loop length; the least common multiple of a chapter's bed loop lengths is at least 300 s; room seconds equal the table.
- A6 Focus curve: the filter frequency is monotone between its ends, starts and ends exactly there, and stays within 350 to 9,000 Hz.
- A7 Loader plan: for any chapter, the plan holds only that chapter's samples and the shared ones; for `enabled = false` it is empty.
- A8 Asset rules: for any valid manifest entry broken in exactly one rule, the check fails with the matching message; a valid manifest passes.

Browser (rendered offline, Playwright in Chrome):

- B1 Every voice renders finite (no NaN or infinity), not silent, with peak at or below the ceiling and a DC offset under 0.01.
- B2 Every voice meets its section 5 target (length, centroid band, partial peaks, envelope shape, decay time).
- B3 Focus filter: pink noise through the chain is at least 20 dB quieter above 2 kHz in `dim` than in `lit`; the repair chime on the stinger bus is not affected; after `light-dies` the window 0.1 to 0.35 s is at least 12 dB quieter than the breath's peak (the beat of silence).
- B4 Limiter: every voice and every bed playing at once never exceeds -1 dBFS (tolerance 0.1 dB, recorded in design.md), also with the master at 0 dB.
- B5 Determinism: the same seed gives bitwise identical buffers; a different seed gives different ones.
- B6 Safety: before `enable()` no audio context exists and nothing is scheduled; hover and focus alone never start sound; after a click on "Turn sound on" exactly one context exists (and reaches `running`; if headless Chrome cannot, say so in design.md and test only the count); `disable()` suspends it.
- B7 Levels: with variation off and the master at its default, every one-shot peaks between -14 and -10 dBFS (tolerance 1.5 dB), the tab tick at -26 dBFS (tolerance 2 dB), every stinger at -9 dBFS (tolerance 1.5 dB), and each chapter's beds together measure -30 dBFS RMS (tolerance 3 dB) over 10 s after the fades.

The limiter tolerance for B4 is 0.1 dB (ceiling -1 dBFS, so a peak up to 0.901 passes). B6 result (Nov 14 2026): in Playwright's Chrome, the click on "Turn sound on" gives exactly one context, and it reaches `running`. `disable()` leaves it `suspended`. So B6 tests both the count and the state.

B7 measures `light-dies` differently: it plays the breath through the closed focus filter on purpose (about -26 dBFS at the output), so its peak is not a one-shot level. The same voice at the same level is measured as `ghost-breath`, and B3 checks the light-dies timing. In B7 and A5, the stingers are `repair` and `level-solved`. Every other event except `tab-tick` is a one-shot.

## Decisions

Where the brief is silent, the simplest option was chosen:

1. **Spec folder.** `.kiro/specs/audio-engine/`, like `level-engine`.
2. **Voice settings live in `voices/defaults.json`; sets carry overrides.** The brief says a set holds exactly `room`, `beds`, `events` and `needsSample`, and also that voice numbers are never hard-coded. A defaults file for the numbers plus an optional `params` on each bed layer or event step satisfies both. The tuning drawer edits the defaults.
3. **Event shape.** An event is `{ id, caption, steps }`; a step is `{ voice, bus, levelDb, at, params?, sample }` with `at` the delay in seconds and `sample` always `null`. `bus` is `world` or `stinger`. Focus actions for `light-dies`, `repair` and `ghost-release` are code in `graph/play.ts`, selected by event id, because they are not sounds.
4. **Bed shape.** `{ id, voice, levelDb, loopSeconds, fadeIn, fadeOut, caption, sample, params? }`. Ranges: `fadeIn` and `fadeOut` 2 to 3 s, `loopSeconds` 30 to 120, bed `levelDb` -50 to -24, one-shot `levelDb` -30 to -9. A5 checks the bed levels, the loop lengths and the fades against these. The tab tick (-26) is the one allowed value below -14 among world one-shots, and stingers are -9; the A5 range check is per event kind.
5. **Porch room is 0.5 s** (the brief's choice). The brief names `needsSample` entries per chapter. Porch has none, so its `needsSample` is `[]`.
6. **`tab-tick` in every chapter** plays `tap` for porch (the sound bible says tap plus `tick`, and `tick` is not code-made here) and the same `tap` in the others, with a 5% pitch variation.
7. **Repair stinger variants.** Chapel plays `church-bell` then `bars` as two steps (the second `at` 1.2 s). Library's `chime` is softened: `levelDb` -10, with a lower `fundamentalHz` (520) and a shorter tail in `params`. Finale plays a distant `church-bell` (-16 dB, darker through `fundamentalHz` 165), then a rising `chord` (`rise` 1, -10 dB, at 1.2 s). The stinger level is -9 dB peak for the loudest step in every other chapter.
8. **Attic `riser` event** plays the `riser` voice and a `drone` with `params` that raise its pitch over 4 s, as two steps on the world bus.
9. **Caption timing.** The merger uses the time of the `play` call. A caption raised for a scheduled sound (`at` in the future) is raised at once, not at the scheduled time.
10. **Captions are written once per event and layer in the set data** (for example `[a clock ticks]`). Each chapter gets its own caption text for the global events when the chapter's sound differs (for example the repair caption).
11. **Context and clock options.** `createAudio({ seed, createContext, clock, tuning? })`. `createContext` returns a `BaseAudioContext`; the default creates an `AudioContext` and is called only inside `enable()`. `tuning` is an optional map of voice settings used by the lab drawer. The brief's three options are kept; `tuning` is extra and has no effect when absent.
12. **Offline contexts.** `enable()` skips `resume()` for an `OfflineAudioContext` and sets `enabled` at once. `disable()` on an offline context only ramps the master to zero.
13. **Dev hook.** None. Suites import the module through the dev server, so the production bundle never needs a hook.
14. **Noise.** Beds and noise voices use buffers generated from `rng` in `noise.ts` (the same bytes for the same seed), never `Math.random` and never a node that makes its own random numbers.
15. **Asset-check code lives in `scripts/check-assets.mjs`** because Node cannot import TypeScript in `npm run check`. It exports `validateManifest(manifest, ctx)` and `captionRuleErrors(text)` and runs its checks only when started as a script. A8 imports it with a dynamic `import()` of its URL and a typed cast. A parity test checks that `captionRuleErrors` and `isValidCaption` agree on a list of strings, so the two copies cannot drift.
16. **A8 predicate and mutant 10.** The manifest mutant (a licence list that accepts `CC-BY`) lives in `tests/property/audio/mutants-assets.test.ts`, not in `mutants.test.ts`, because it needs the asset check, which the brief puts late. Together the two files hold 10 mutants.
17. **Mutant for "a one-shot 10 dB too loud"** is shown to fail A5's level range in Node. B7 also covers it in Chrome.
18. **Production-build test** runs in Node through Vite's build API (see Testing approach), so it is not a browser task.
19. **Lab files.** `labs/sound/index.html`, `lab.ts`, `lab.css`, `tuning.ts`. The tuning values are kept in `sessionStorage` under `kg-sound-tune`, read only when `?tune=1` is present.
20. **Browser command.** Each browser task runs `npx playwright test <its spec>`. The Playwright config starts and stops its own dev server on 5185 (`reuseExistingServer: false`). Before it starts, a task checks the port; if it is busy, it waits up to 60 seconds, then reports "port busy".
21. **Render tool command.** `node --experimental-strip-types tools/sound/render.ts`. The script imports only node built-ins, `vite` (to start the dev server on 5185 with `createServer`, `strictPort`) and `chromium` from `@playwright/test`. It imports nothing from `src`: rendering and analysis run in the page through the dev server. The task records the exact working command in `docs/architecture/audio.md`.
22. **Spectrogram pictures** are drawn in the page on a `<canvas>` from the analysis FFT and saved with `canvas.toDataURL`, so no image dependency is added. The tool also draws the room impulse of each chapter (`room-<chapter>.png`), so the review can check the room tails.

Decisions made while building (Nov 14 2026):

23. **At most two inputs per summing node.** The first B5 run failed: the `chime` differed by one bit from sample 2 on. Chrome adds a node's inputs in an order that can change between runs, and with three or more inputs the float rounding changes. `graph/mixer.ts` therefore sums in binary trees (`sumInputs`) and gives each bus a fixed pool of slots (`createSlotMixer`: beds 8, world 32, breath 8, stingers 16). When every slot is busy, the slot that frees first is taken over (a hard cut, which should be rare).
24. **Compressor make-up gain.** Chrome's `DynamicsCompressorNode` always adds a make-up gain of (1/g)^0.6, where g is its gain for a 0 dBFS input. With these settings that is +3.42 dB. A gain right after it cancels this, so set levels are output levels. The first guess (1.72 dB) left every level 1.7 dB high in the first B7 measurement.
25. **Room send at -22 dB** (it started at -16 dB, which added about 2 dB to every one-shot peak).
26. **Voice calibration.** Every voice is trimmed to a -3 dBFS peak at its own output (`trimDb`, measured at seed 1). The engine applies `levelDb + 9` dB to a step and `levelDb - rmsDb + 6` dB to a bed layer. Exceptions found by measuring: `tap` +1.5 dB, because the oversampled clipper softens its 50 ms peak; `chains` -1.5 dB, because its random bursts peak higher at other seeds.
27. **Extra `createAudio` options:** `variation` (off for B7), `beds` (off so events can be measured alone; the lab uses it to start beds by hand) and `onChain` (the lab's meter). None of them changes the default behaviour.
28. **A sample id is the manifest entry's `path`**, because the brief's entry has no id field.
29. **Breath and wind filters (review rounds 1 and 2).** The breath has two high-pass and two low-pass stages. The wind has two band-passes that move together and a high-pass at half the band's lowest centre. See `docs/evidence/sound/REVIEW.md`.
30. **Browser suites run on one worker** (`npx playwright test tests/e2e/audio --workers=1`), and each spec file sets a 180 s test timeout with `test.describe.configure`. The first full run on parallel workers timed out in 5 of 78 tests (page loads and renders at 30 s); every one passed alone. `playwright.config.ts` is not ours to edit.

## Differences from the brief

- `mutants-assets.test.ts` holds mutant 10 (decision 16). The other nine are in `mutants.test.ts`.
- The A8 predicate helper lives in `tests/property/audio/assets-props.ts`.
- No other difference is known. If the owner's brief and this file ever disagree, the brief wins.
