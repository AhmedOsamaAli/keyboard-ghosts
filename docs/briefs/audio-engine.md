# Brief: audio-engine (spec 4 of 9)

Owner decisions, written Nov 14 2026. Spec name: `audio-engine`. Branch: `feat/audio`.
This brief answers every clarifying question. If something is missing, choose the simplest option and record it in design.md under "Decisions". If the spec documents ever disagree with this brief, follow the brief and note the difference in design.md.

## 1. Goal

Build the game's sound: a Web Audio engine whose signature is **the sound goes out of focus with the picture**. When the light dies, the mix turns dull and muffled; when the ghost is repaired, it snaps open with a chime. Everything is **made in code** here (no recordings are needed to ship), and the engine is ready to play free CC0 recordings later, layered under or instead of the code-made voices. It must be safe (off by default, never loud, always captioned), proven (objective audio checks and property tests) and **tunable by ear** in a sound lab, because the owner is the only judge of "does it sound fake". The honest ceiling is "a good indie game", so design for layering, variation and silence, not for one perfect sample.

## 2. Not in this spec

Wiring sound into the shell, the levels or the light effect (a later spec calls this engine; here the lab fakes the light with Break and Restore buttons). Downloading or editing any recording (the owner sources those later; this spec only builds the loader and the checks, with fixtures). Voices that need real recordings to be convincing (birds, footsteps, page turns, pencil, cloth, boxes, match, organ and singing): leave them as a named "needs a sample" list in each sound set and in `docs/architecture/audio.md`. No voice, no music except the code-made score, no AI-generated clips, no new dependency (no Tone.js). Do not edit `src/engine` (import only from `src/engine/index.ts`, and only `createRng` and `CHAPTER_IDS`), `src/fx`, `src/ui`, `looks/`, `levels/`.

## 3. Files you own

`src/audio/**` (the sound sets are data in `src/audio/sets/*.json`), `labs/sound/**`, `tools/sound/**`, `tests/unit/audio/**`, `tests/property/audio/**`, `tests/e2e/audio/**`, `tests/fixtures/audio/**`, `docs/architecture/audio.md`, `docs/evidence/sound/**`, `scripts/check-assets.mjs`, `assets/manifest.json` (schema only, no entries), `ATTRIBUTION.md` (text about the engine only), `tsconfig.json` (add `labs` and `tools` to `include`, exactly as `["src","tests","labs","tools","vite.config.ts","playwright.config.ts"]`; the fx spec makes the same edit), `eslint.config.js` (audio rules only, in one task, see section 4 item 6) and `docs/KIRO_LOG.md` (one dated entry). `.local/e2e-port` already exists and holds `5185`: do not change it. Do not edit `package.json` (no new dependency, no new script), `playwright.config.ts` or `vite.config.ts`. The focus-guard hook blocks `outline: none` and `outline: 0` under `src/`: never work around it.

## 4. Decisions already made

1. **Web Audio API only.** Plain TypeScript, no audio library.
2. **Pure modules** (parameters, recipes as numbers, mix math, captions, sound-set data, loader plan, manifest rules) are tested in Node. **Audio graphs** are tested in Chrome by rendering with `OfflineAudioContext` and analysing the buffer (no DOM emulation, no ears). Nothing asserts elapsed time (docs/decisions.md, D4): use the offline renderer's own time.
3. **Sound is off by default.** The `AudioContext` is created only inside `enable()`, which must be called from a user gesture. Nothing plays or even creates an audio context on page load, on hover, or on focus alone. `disable()` fades out in 0.2 s and suspends.
4. **One master chain:** voices and buses, then master gain (default -6 dB), then a limiter: a `DynamicsCompressorNode` (threshold -6 dB, knee 0, ratio 20, attack 3 ms, release 120 ms) followed by a soft clipper (`WaveShaperNode`, tanh curve) scaled so the ceiling is **-1 dBFS** (peak 0.891). The master level can be set from -40 dB to 0 dB. Nothing may exceed the ceiling, even when every sound plays at once with the master at 0 dB.
5. **The focus filter is a low-pass on the "world bus"** (beds, one-shots, ghost breath). **Stingers and the repair chime go around it** on their own bus, so they stay bright when the world is muffled.
6. **All randomness goes through a seeded generator** (`createRng` from the engine barrel), injectable, so renders are repeatable: the same seed gives bitwise identical buffers. No `Math.random`, no `Date`, no `performance`, no timers in `src/audio`: time comes from the audio context's own clock, and anything that needs `fetch` receives it as an argument. The ESLint rules for `src/audio/**` are added late, in one task, in `eslint.config.js`, like the engine's purity rules (also no `document` or `window`, and no imports from `src/fx`, `src/ui`, `src/checks` or `src/hunt`).
7. **Every sound has a code-made body** (a recipe). A sound may also name a sample id from `assets/manifest.json`; this spec ships none, so every `sample` is `null`, and the loader and checks are tested with fixtures.
8. **Captions are events, not DOM.** The engine raises a caption event for every sound; the shell will show and announce them later.
9. Sound sets are keyed by **chapter id** (`porch`, `foyer`, `chapel`, `gallery`, `library`, `attic`, `finale`). The `soundSet` word in the look files (`candle`, `glass`, and so on) is only a label for now; do not read it.

## 5. Voices to build now (all code-made; every chapter in section 6 needs these)

Each voice is a small recipe with named numeric settings in the sound-set data, never hard-coded. The "target" column is what the objective checks measure (wide tolerances; the owner tunes by ear afterwards).

| Voice | How it is made | Target (for the checks) |
|---|---|---|
| `tap` | 50 ms noise burst through a band-pass (about 1.3 kHz, Q 5) plus a falling sine 180 to 90 Hz in 60 ms | length at most 150 ms; centroid 600 to 2,500 Hz |
| `chime` | sine partials at ratios 1, 2.76, 5.4, 8.93 with fades proportional to 1/ratio, long tail | length 1.5 to 3 s; partial peaks within 2% of the ratios |
| `glass-ring` | partials 1, 2.32, 4.25, 6.63, 9.38, fundamental about 880 Hz, tail 2.5 s | partial peaks within 2% |
| `clock-chime` | bell partials, fundamental about 523 Hz, tail 1.8 s | length 1.2 to 2.5 s |
| `church-bell` | partials 0.5, 1, 1.2, 1.5, 2, 2.5, 3, 4 on about 196 Hz, tail 5 s | length 4 to 7 s; strong energy below 400 Hz |
| `clock-tick` | very short noise click through a high-pass with a tiny pitch drop | length at most 40 ms |
| `breath` | filtered noise (500 to 3,000 Hz) swelling over about 1 s, then thinning into a soft 300 Hz tone | RMS peak between 0.7 s and 1.2 s; the end is tonal |
| `whoosh` | noise through a band-pass sweeping 400 to 2,400 Hz over 0.7 s | length 0.5 to 1.2 s |
| `wind` | noise through a band-pass whose centre drifts slowly (300 to 900 Hz), level also drifts | centroid 250 to 1,200 Hz |
| `wind-gaps` | the same, narrower and higher (700 to 1,800 Hz), with whistling resonances | centroid 600 to 2,000 Hz |
| `room-tone` | brown noise through a soft low-pass | centroid under 500 Hz |
| `fire` | very low rumble plus sparse crackle bursts | crest factor at least 12 dB |
| `rain-roof` | dense noise, band-limited | centroid 2.5 to 6 kHz |
| `thunder` | low rumble 20 to 120 Hz with a long slow decay | length 3 to 6 s; energy below 150 Hz |
| `floor-creak` / `door-creak` | friction model: a sawtooth whose pitch wanders 120 to 400 Hz through a resonant band-pass, with stick-slip amplitude (8 to 25 Hz) | length 0.4 to 1.5 s; amplitude modulation present |
| `big-door` | a low thud (60 Hz, 0.3 s) then a slow creak | length 0.8 to 2 s |
| `chains` | bursts of metallic partials (2 to 6 kHz) with random spacing | centroid above 2 kHz |
| `bars` | a rising scrape (noise through a band-pass sweeping 1 to 3 kHz over 0.6 s), then a clank of two inharmonic partials (about 1.1 and 2.7 kHz, 0.4 s) | length 0.8 to 1.6 s; centroid above 1,200 Hz |
| `chord` | a soft major chord (sine and triangle partials stacked 4:5:6 and an octave), 0.15 s attack, 2 s tail; a `rise` setting slides each note up a whole tone over 2 s (used by the finale) | length 1.5 to 3.5 s; three peaks at ratios 4:5:6 within 2% |
| `murmur` | noise through two formant band-passes (about 500 and 1,500 Hz) with a drifting 3 to 5 Hz syllable-like swell | centroid 400 to 1,400 Hz; modulation rate 2 to 6 Hz |
| `drip` | a sine blip rising 800 to 1,600 Hz in 40 ms with a fast decay and a faint room tail | length at most 400 ms |
| `music-box` | a comb tine: sine partials at ratios 1, 6.27 and 17.55 (fundamental about 784 Hz), decays about 0.9, 0.3 and 0.1 s | length 0.6 to 1.5 s; partial peaks within 3% |
| `drone` | three detuned saws near 55 Hz through a slowly moving low-pass | centroid under 400 Hz; fundamental near 55 Hz |
| `riser` | noise plus a rising sine (200 to 1,600 Hz) with a crescendo over 4 s | level at the end at least 10 dB above the start |
| `heartbeat` | two low thumps (about 60 and 50 Hz) 0.28 s apart, repeating | energy below 150 Hz |
| `room` (reverb) | a generated impulse: decaying noise with early reflections and a low-pass that closes over time | measured decay time within 25% of the chapter's room seconds |

Chapter room (echo) seconds from the sound bible: foyer 0.9, chapel 3.2, gallery 1.6, library 0.7, attic 1.2, finale 2.0. The bible has no Porch value: use 0.5 (a short open-porch room; the planner's choice, tunable in the lab). The targets are measured on the voice itself, before the sound set's level is applied.

## 6. Sound sets, events and captions

Sound-set data (zod, `src/audio/sets/<chapter>.json`): `room` seconds, `beds` (each layer: voice, level in dB, loop length in seconds, fade in and out, caption), `events` (each: the voice or voices, the bus, the level in dB, the caption; a stinger may carry small overrides such as a softer level or a darker tone) and `needsSample` (what waits for a recording). Each set holds exactly this, code-made only; what the sound bible (`.kiro/steering/sound-bible.md`, section 1) gives a chapter but needs a recording goes to `needsSample`:

| Chapter | Beds (voice, loop seconds) | Chapter events | Repair stinger | `needsSample` |
|---|---|---|---|---|
| porch | `wind` 47, `clock-tick` 61 | none | `chime` | none |
| foyer | `fire` 53 (very low), `room-tone` 61 | `clock-chime`, `floor-creak`, `door-creak` | `glass-ring` | match |
| chapel | `room-tone` 47 (the empty church), `drone` 59 (very low, stands in for the organ) | `church-bell`, `bars`, `chains`, `big-door` | `church-bell`, then `bars` | organ and singing |
| gallery | `murmur` 47, `clock-tick` 61 | none | `music-box` | footsteps (stone and wood), cloth |
| library | `room-tone` 53, `rain-roof` 67 (very soft) | `drip` | `chime`, softened | pages, pencil |
| attic | `wind-gaps` 47, `rain-roof` 61 | `floor-creak`, `door-creak`, `chains`, `heartbeat`, `thunder`, `riser` (the `riser` voice over a rising `drone`) | `chime` | boxes |
| finale | `room-tone` 53, `wind` 67 (very soft dawn air) | `big-door` | `church-bell` (distant), then a rising `chord` | birds at dawn, footsteps leaving |

`floor-creak` and `door-creak` are the same recipe with each chapter's own settings (the attic's is a thin hinge, the foyer's a wooden door). The tests keep their own copy of this table.

Global events (every chapter's set holds all seven, each with its own caption):

| Event | What plays | Bus |
|---|---|---|
| `tab-tick` | `tap`, pitch varied 5% each press | world |
| `light-dies` | the focus filter closes, beds drop 6 dB, a beat of near silence, then the `breath` rises (section 7) | world |
| `repair` | the filter opens in 0.12 s and the chapter's repair stinger plays | stinger |
| `ghost-breath` | `breath` | world |
| `ghost-release` | `whoosh`, then a soft `chord`; the breath thins to a single tone | world, then stinger |
| `chapter-card` | a soft `chord` swell, 2 s | stinger |
| `level-solved` | the chapter's repair stinger and a `chord` | stinger |

A chapter's set holds the seven global events plus the chapter events in the table above, and no other event.

Captions: lower case, in square brackets, at most 6 words, present tense (for example `[a heavy door thuds]`). The tests check the mechanical rules (starts with `[` and ends with `]`, no capital letters, 1 to 6 words, no digits, no punctuation except hyphens and apostrophes); present tense is checked by eye in the review. Every event and every bed layer has exactly one caption in the set data, and every caption belongs to an event or a bed layer. A caption event carries `{ id, text, quiet }`; `quiet` is true for `tab-tick`, so the shell never announces a caption for every Tab press. A caption is merged (not emitted) when the same text was emitted less than 400 ms ago (a pure merger with an injected clock); a different text is never dropped. Beds raise their caption once, when they start.

## 7. The mix and the focus filter (starting numbers from the sound bible)

Beds about -30 dBFS with 2 to 3 s fades and a 3 s cross-fade between rooms, two layers with different loop lengths (for example 47 s and 61 s) so the join is never obvious; one-shots peak between -14 and -10 dBFS; tab tick about -26 dBFS with its pitch varied by 5% each press; stingers peak about -9 dBFS; variation on every play: pitch up to 3% (50 cents), level up to 2 dB, filter up to 8%. Silence is a tool: after `light-dies`, about 400 ms of near silence before the breath rises. **All levels are measured at the final output with the master at its default -6 dB (so the master is already counted) and with variation switched off:** one-shots and stingers as peak dBFS, a chapter's beds together as RMS dBFS.

Focus filter: in focus, a low-pass at 9,000 Hz. `light-dies`: closes to 350 Hz with a 0.35 s glide, beds drop 6 dB, the breath rises 8 dB. `repair`: the filter opens in 0.12 s and the chime plays on the stinger bus at full brightness. `ghost-release`: the release whoosh and a soft chord, and the ghost's breath thins into a single tone. The engine has `setFocusState("lit" | "dim")` and the pure function that gives the filter frequency over time (monotone between its ends, never outside 350 to 9,000 Hz).

## 8. The API (`src/audio/index.ts`, the only public entry)

`createAudio(options)` returns `{ enable(): Promise<void>; disable(): Promise<void>; setChapter(id): void; setFocusState(state): void; play(event, options?): void; setMaster(db): void; onCaption(listener): () => void; state(): AudioState; dispose(): void }`, and `nullAudio` does nothing. Options: the seed, an injectable context factory (so tests can pass an offline context), and a clock. `play` options are `{ at?: number }`, seconds on the context's clock, so offline renders can place sounds (default: now). `enable()` must work with an `OfflineAudioContext` too (it cannot be resumed). `state()` reports enabled, chapter, focus state, master level and the active layers, for tests. Sounds load per chapter (the loader plan lists only that chapter's samples and the shared ones; none load before `enable()`).

## 9. Asset rules (extend `scripts/check-assets.mjs`; keep it a Node script that `npm run check` runs)

Every file under `assets/sounds/<chapter>/<need>-<short-name>.<ext>` has a manifest entry `{ path, source, author, licence, proof, caption }` with `licence` one of `CC0`, `public-domain`, `original-code`, a proof file under `assets/licences/` that exists, and a caption that follows the caption rules. A manifest entry without a file fails too. A sound set that names a sample id must find it in the manifest. Fixtures under `tests/fixtures/audio/` prove each rule fails when broken. The repo ships no entries yet.

## 10. Properties (fast-check, at least 200 runs, `tests/property/audio/`, using `tests/property/fc-config.ts`)

Node:
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

## 11. Tests that prove the tests

At least 10 deliberate mutants in `tests/property/audio/mutants.test.ts` (or the browser suite where they need rendering), each shown to fail the matching property: a limiter ceiling of 0 dBFS; a caption merger that drops a distinct caption; a variation that allows 6%; a focus curve that overshoots below 350 Hz; a loader that loads every chapter; a manifest check that accepts `CC-BY`; a caption rule that allows 8 words; a bed set with two equal loop lengths; a chapter set with a single bed layer; a one-shot 10 dB too loud.

## 12. The sound lab, the render tool and the review loop

**Port: this worktree uses 5185** (`.local/e2e-port` already exists and holds `5185`; the Playwright config reads it). Never use 5173, 5183 or 5184. Every browser task is in one lane: two of them never run together; each stops every server and browser it starts, even on failure; if port 5185 is busy it waits up to 60 seconds and reports "port busy" without killing anything. The browser suites reach the code through the dev server (`import('/keyboard-ghosts/src/audio/index.ts')` inside `page.evaluate`) or a dev-only hook in the lab; the production bundle never contains a hook.

- `labs/sound/index.html` (dev server only, never in the build): a skip link, "Turn sound on" (the user gesture), a master level slider, a chapter picker, one "Play" button for each voice and event with its caption shown, each chapter's beds with start and stop, **Break the light** and **Restore the light** buttons that call `setFocusState` and `play("light-dies")` and `play("repair")`, a peak meter (text, with a label), and "Press Tab to hear ticks". A tuning drawer behind `?tune=1`, dev only: a slider for each recipe number, "Copy sound JSON" (the owner tunes by ear, copies the numbers, and tells Kiro to lock them in), values kept in `sessionStorage`. Real labels, no colour-only meaning, visible focus, axe 0 violations. A production build contains no trace of the lab or the drawer: a test builds a tiny fixture entry that imports all of `src/audio` and searches the output for the lab and tuning markers and for any test hook (the fx spec makes a similar test in its own branch; do not wait for it).
- `tools/sound/render.ts`: a plain Node script that opens Chrome through `chromium` from `@playwright/test` (no new npm script; write the exact command in `docs/architecture/audio.md`), renders every voice offline and writes WAV files to `.local/sound/` (git-ignored) and a spectrogram picture for each voice to `docs/evidence/sound/<voice>.png`, and prints a table of the measured numbers against the targets.
- **Review loop** (at most 2 rounds, last tasks): view the spectrograms and the table. Check: a bell shows separate decaying partial lines; the breath swells then thins; wind is a moving band, not a hiss; the room tails look like smooth decays; the creaks show a wandering pitch; nothing is clipped. Fix what fails, render again, and write each round in `docs/evidence/sound/REVIEW.md` (what changed, what is still weak, and "needs the owner's ears"). If you cannot open images, say so plainly and stop this task.

## 13. Rules for tasks.md

- No task is optional: no `*` markers, including every property, mutant and e2e test.
- **Every task has an "After: <task numbers>" line and a "Files:" line.** Two tasks run together only when neither names the other and they share no file. Where tasks in different groups edit the same file, the later one names the earlier one.
- Browser lane: tasks that start the dev server, Playwright or a browser (the offline-render tests, the lab tests, the render tool, the review loop) never run together (section 12). Chain them with After lines.
- Run `npx prettier --write` on the files you created or edited. Do not run `npm run format` (it rewrites files other tasks are editing); only the final task runs it.
- Order: pure modules and their properties, then mutants, then the audio graph modules, then the lab, then the browser suites, then the render tool and the review loop, then the asset check, then docs and the log. Shared files (`tsconfig.json`, `eslint.config.js`, `scripts/check-assets.mjs`, `docs/KIRO_LOG.md`) are edited in one task each, late.
- The final task runs `npm run format`, `npm run check` (green, and green again with `FC_SEED=1` and `FC_SEED=2`), `npm run build`, and the browser suites when no other browser task is running.

## 14. Definition of done

- Every task done; `npm run check`, `npm run build` and the browser suites green.
- A1 to A8 and B1 to B7 pass; at least 10 mutants fail their property; every voice meets its target.
- `docs/architecture/audio.md` (diagram of the buses and the focus filter, the API, the event and caption table, the sound-set format, the "needs a sample" list, how to tune in the lab) and a dated entry in `docs/KIRO_LOG.md` (counts and surprises).
- Final reply in five lines: what exists; the test counts; what the spectrograms show (honest, including what needs the owner's ears); anything the brief got wrong; the credit cost if Kiro shows it.
