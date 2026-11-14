# Requirements: audio-engine

Source: [docs/briefs/audio-engine.md](../../../docs/briefs/audio-engine.md). The brief wins over this file. "Brief §n" points to a section of the brief; "§4.n" points to a numbered decision in its section 4.

Terms: the **engine** is the code in `src/audio/`. A **voice** is one code-made sound recipe. A **bed** is a looping background layer. An **event** is a named game sound such as `repair`. A **bus** is a group of voices that share one gain and one route to the master chain. The **world bus** carries beds, one-shots and ghost breath. The **stinger bus** carries stingers and the repair chime. The **focus filter** is the low-pass on the world bus.

## Goal and scope

**R1 (Brief §1).** The engine shall make the sound go out of focus with the picture: when the light dies the mix turns dull and muffled, and when the ghost is repaired it opens with a chime. The engine shall make every sound in code, shall be able to play CC0 recordings later, shall be off by default, never loud and always captioned, and shall be tunable by ear in a sound lab.

**R2 (Brief §2).** The spec shall not wire sound into the shell, the levels or the light effect, shall not download or edit any recording, and shall not add a voice outside section 5, a music track other than the code-made score, an AI-generated clip or a dependency. It shall not edit `src/fx`, `src/ui`, `looks/` or `levels/`. The engine shall import from `src/engine/index.ts` only `createRng` and `CHAPTER_IDS`. Voices that need a recording shall be listed as `needsSample` in each sound set and in `docs/architecture/audio.md`.

**R3 (Brief §3).** The work shall touch only the files the brief lists in section 3. It shall not edit `package.json`, `playwright.config.ts`, `vite.config.ts` or `.local/e2e-port`, and shall not work around the focus-guard hook. `tsconfig.json` shall get `include` exactly `["src","tests","labs","tools","vite.config.ts","playwright.config.ts"]`.

## Decisions already made

**R4 (Brief §4.1).** The engine shall use the Web Audio API and plain TypeScript only, with no audio library.

**R5 (Brief §4.2).** Pure modules (parameters, recipes as numbers, mix math, captions, sound-set data, loader plan, manifest rules) shall be tested in Node. Audio graphs shall be tested in Chrome by rendering with `OfflineAudioContext` and analysing the buffer. No test shall assert elapsed time; renders use the offline renderer's own time (D4).

**R6 (Brief §4.3).** While sound has not been enabled, the engine shall create no `AudioContext` and schedule nothing, including on page load, on hover and on focus alone. When `enable()` is called from a user gesture, the engine shall create the context there. When `disable()` is called, the engine shall fade out in 0.2 s and suspend the context.

**R7 (Brief §4.4).** Voices and buses shall feed one master chain: master gain (default -6 dB, settable from -40 dB to 0 dB), then a `DynamicsCompressorNode` (threshold -6 dB, knee 0, ratio 20, attack 3 ms, release 120 ms), then a tanh soft clipper (`WaveShaperNode`) scaled to a ceiling of -1 dBFS (peak 0.891). No output shall exceed the ceiling, even when every sound plays at once with the master at 0 dB.

**R8 (Brief §4.5).** The focus filter shall be a low-pass on the world bus. Stingers and the repair chime shall use their own bus that goes around the focus filter and stays bright when the world is muffled.

**R9 (Brief §4.6).** All randomness in `src/audio` shall come from an injectable seeded generator (`createRng`), so the same seed gives bitwise identical buffers. `src/audio` shall not use `Math.random`, `Date`, `performance`, timers, `document` or `window`, shall receive `fetch` as an argument, and shall not import from `src/fx`, `src/ui`, `src/checks` or `src/hunt`. ESLint rules that enforce this shall be added in one late task in `eslint.config.js`.

**R10 (Brief §4.7).** Every sound shall have a code-made recipe. A sound may name a sample id from `assets/manifest.json`; this spec ships none, so every `sample` shall be `null`. The loader and the checks shall be tested with fixtures.

**R11 (Brief §4.8).** The engine shall raise a caption event for every sound. Captions shall be events, not DOM.

**R12 (Brief §4.9).** Sound sets shall be keyed by chapter id (`porch`, `foyer`, `chapel`, `gallery`, `library`, `attic`, `finale`). The engine shall not read the `soundSet` word in the look files.

## Voices

**R13 (Brief §5, recipes).** The engine shall provide these voices: `tap`, `chime`, `glass-ring`, `clock-chime`, `church-bell`, `clock-tick`, `breath`, `whoosh`, `wind`, `wind-gaps`, `room-tone`, `fire`, `rain-roof`, `thunder`, `floor-creak`, `door-creak`, `big-door`, `chains`, `bars`, `chord`, `murmur`, `drip`, `music-box`, `drone`, `riser`, `heartbeat` and the `room` reverb impulse. Each shall be made as the brief's table describes, and each shall take its numbers as named settings from sound-set data, never hard-coded. `floor-creak` and `door-creak` shall be one recipe with different settings. `chord` shall have a `rise` setting.

**R14 (Brief §5, targets).** Each voice shall meet its target in the brief's table (length, centroid band, partial peaks, envelope shape, decay time), measured on the voice itself before the sound set's level is applied. The `room` impulse shall have a measured decay within 25% of the chapter's room seconds: porch 0.5, foyer 0.9, chapel 3.2, gallery 1.6, library 0.7, attic 1.2, finale 2.0.

## Sound sets, events and captions

**R15 (Brief §6, set data).** Each chapter shall have a zod-validated file `src/audio/sets/<chapter>.json` that holds exactly `room` seconds, `beds` (voice, level in dB, loop length, fade in, fade out, caption), `events` (voice or voices, bus, level in dB, caption, optional small overrides) and `needsSample`, all code-made only.

**R16 (Brief §6, chapter table).** Each set shall hold the beds, chapter events, repair stinger and `needsSample` entries that the brief's chapter table gives it, and no others.

**R17 (Brief §6, global events).** Every set shall hold the seven global events (`tab-tick`, `light-dies`, `repair`, `ghost-breath`, `ghost-release`, `chapter-card`, `level-solved`), each with its own caption, voices and bus as the brief's table says. A set shall hold the seven global events plus its chapter events, and no other event.

**R18 (Brief §6, caption rules).** Every caption shall start with `[` and end with `]`, shall have no capital letters, 1 to 6 words, no digits and no punctuation except hyphens and apostrophes, and shall be in the present tense. Every event and every bed layer shall have exactly one caption, and every caption shall belong to an event or a bed layer.

**R19 (Brief §6, caption events).** A caption event shall carry `{ id, text, quiet }`, with `quiet` true for `tab-tick`. A pure merger with an injected clock shall merge (not emit) a caption whose text was emitted less than 400 ms ago, and shall never drop a different text. A bed shall raise its caption once, when it starts.

## Mix and focus filter

**R20 (Brief §7, mix).** With variation off and the master at -6 dB, one-shots shall peak between -14 and -10 dBFS, the tab tick at about -26 dBFS, stingers at about -9 dBFS, and a chapter's beds together at about -30 dBFS RMS, with 2 to 3 s fades and a 3 s cross-fade between rooms. Each play shall vary pitch by up to 3% (50 cents), level by up to 2 dB and filter by up to 8%; the tab tick shall vary pitch by 5%. After `light-dies` there shall be about 400 ms of near silence before the breath rises.

**R21 (Brief §7, focus filter).** In focus the filter shall be 9,000 Hz. On `light-dies` it shall close to 350 Hz with a 0.35 s glide, beds shall drop 6 dB and the breath shall rise 8 dB. On `repair` the filter shall open in 0.12 s and the chime shall play on the stinger bus. On `ghost-release` the whoosh and a soft chord shall play and the breath shall thin to a single tone. The engine shall have `setFocusState("lit" | "dim")` and a pure function for the filter frequency over time, monotone between its ends and always within 350 to 9,000 Hz.

## API and assets

**R22 (Brief §8, API).** `src/audio/index.ts` shall be the only public entry. It shall export `createAudio(options)`, which returns `{ enable, disable, setChapter, setFocusState, play, setMaster, onCaption, state, dispose }`, and `nullAudio`, which does nothing. Options shall be the seed, an injectable context factory and a clock. `play` options shall be `{ at?: number }` in seconds on the context's clock. `enable()` shall work with an `OfflineAudioContext`. `state()` shall report enabled, chapter, focus state, master level and active layers. The loader plan shall list only the chosen chapter's samples and the shared ones, and nothing shall load before `enable()`.

**R23 (Brief §9, asset rules).** `scripts/check-assets.mjs` shall stay a Node script run by `npm run check`. Every file under `assets/sounds/<chapter>/<need>-<short-name>.<ext>` shall have a manifest entry `{ path, source, author, licence, proof, caption }` with `licence` one of `CC0`, `public-domain`, `original-code`, an existing proof file under `assets/licences/`, and a caption that follows R18. A manifest entry without a file shall fail. A sound set that names a sample id shall find it in the manifest. Fixtures under `tests/fixtures/audio/` shall show that each rule fails when broken. The repo shall ship no entries.

## Proof

**R24 (Brief §10, properties).** Properties A1 to A8 (Node) and B1 to B7 (Chrome, offline render) shall exist as stated in the brief, with at least 200 runs for A1 to A8, using `tests/property/fc-config.ts`.

**R25 (Brief §11, mutants).** At least 10 deliberate mutants shall each be shown to fail the matching property: limiter ceiling 0 dBFS; caption merger that drops a distinct caption; variation allowing 6%; focus curve below 350 Hz; loader that loads every chapter; manifest check that accepts `CC-BY`; caption rule allowing 8 words; two equal loop lengths; a chapter with one bed layer; a one-shot 10 dB too loud.

## Lab, tool and review

**R26 (Brief §12, lab).** `labs/sound/index.html` shall be dev-server only and shall have: a skip link, "Turn sound on", a master level slider, a chapter picker, a "Play" button for each voice and event with its caption shown, each chapter's beds with start and stop, "Break the light" and "Restore the light" buttons, a labelled text peak meter, and "Press Tab to hear ticks". With `?tune=1` it shall show a dev-only drawer with a slider for each recipe number and "Copy sound JSON", with values kept in `sessionStorage`. The lab shall have real labels, no colour-only meaning, visible focus and zero axe violations. A production build shall contain no trace of the lab, the drawer or any test hook, shown by a fixture build.

**R27 (Brief §12, render tool).** `tools/sound/render.ts` shall be a plain Node script that opens Chrome through `chromium` from `@playwright/test`, renders every voice offline, writes WAV files to `.local/sound/` and a spectrogram to `docs/evidence/sound/<voice>.png`, and prints a table of measured numbers against targets. The exact command shall be in `docs/architecture/audio.md`.

**R28 (Brief §12, review loop).** The review loop shall run at most 2 rounds. Each round shall view the spectrograms and table against the brief's checklist, fix what fails, render again, and write what changed, what is still weak and "needs the owner's ears" in `docs/evidence/sound/REVIEW.md`. If images cannot be opened, the task shall say so plainly and stop.

**R29 (Brief §12, port and lane).** Browser tasks shall use port 5185 (never 5173, 5183 or 5184), shall run one at a time, shall stop every server and browser they start even on failure, and shall wait up to 60 seconds if the port is busy, then report "port busy" without killing anything. Browser suites shall reach the code through the dev server or a dev-only lab hook, never a hook in the production bundle.

## Process and finish

**R30 (Brief §13, tasks).** No task shall be optional. Every task shall have an "After" line and a "Files:" line. Shared files shall be edited in one task each, late. Own files shall be formatted with `npx prettier --write`; only the final task runs `npm run format`.

**R31 (Brief §14, done).** The spec is done when every task is done, `npm run check`, `npm run build` and the browser suites are green, A1 to A8 and B1 to B7 pass, at least 10 mutants fail their property, every voice meets its target, `docs/architecture/audio.md` and a dated `docs/KIRO_LOG.md` entry exist, and the final reply follows the brief's five-line form.
