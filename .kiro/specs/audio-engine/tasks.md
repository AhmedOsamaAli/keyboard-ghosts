# Tasks: audio-engine

Source: [brief §13](../../../docs/briefs/audio-engine.md). Requirements: [requirements.md](requirements.md). Design: [design.md](design.md). Every task is required; none is optional.

How to read this file:

- A task starts only when every task in its "After" line is done. Two tasks run together only when neither names the other and they share no file. Where tasks in different groups edit the same file, the later one names the earlier one.
- "Files" lists every file the task creates or edits. "Covers" lists requirements (R) and properties (A, B).
- Every task ends by running `npx prettier --write` on the files it created or edited. No task except the last one runs `npm run format`.
- Browser lane: tasks 44 to 54 and 63 start the dev server, Playwright or a browser. They use port 5185 (the value in `.local/e2e-port`), never 5173, 5183 or 5184, and are chained with After lines so that two never run together. Each one checks the port first; if it is busy it waits up to 60 seconds and then reports "port busy" without killing anything. Each stops every server and browser it started, even on failure. Each runs `npx playwright test <its spec>`.
- Tasks 1 to 43, 55 to 62 start no browser and no server. Task 42 builds with the Vite API in Node only.

Order of work: pure modules (1 to 8), data (9 to 14), properties (15 to 23), mutants (24), audio graph modules (25 to 38), lab (39 to 42), browser suites (43 to 51), render tool and review loop (52 to 54), asset check (55 to 58), shared files (59 to 60), docs and log (61 to 62), final (63).

## Pure modules (run together)

- [x] 1. Add the mix maths
  - Create `src/audio/db.ts`: `dbToGain`, `gainToDb`, `CEILING_DB` (-1), `CEILING` (0.891), `MASTER_MIN_DB` (-40), `MASTER_MAX_DB` (0), `MASTER_DEFAULT_DB` (-6), `clampMaster`, `softClipCurve(samples)` (the tanh curve with k solved so the slope at 0 is 1 and curve(1) equals the ceiling), `limiterModel(peak)`.
  - Create `tests/unit/audio/db.test.ts`: known values, round trip, curve ends, clamp limits.
  - Files: `src/audio/db.ts`, `tests/unit/audio/db.test.ts`
  - Covers: R7, A2.
  - After: none.

- [x] 2. Add the variation
  - Create `src/audio/variation.ts`: `vary(rng, base, limits)` giving pitch ratio (limit 50 cents), level in dB (limit 2) and filter factor (limit 8%); the tab tick uses a 5% pitch limit; helpers `centsToRatio`.
  - Create `tests/unit/audio/variation.test.ts`: same seed same result, bounds, zero limits give no change.
  - Files: `src/audio/variation.ts`, `tests/unit/audio/variation.test.ts`
  - Covers: R9, R20, A1.
  - After: none.

- [x] 3. Add the caption rules and merger
  - Create `src/audio/captions.ts`: `isValidCaption(text)`, `captionErrors(text)` (brackets, lower case, 1 to 6 words, no digits, no punctuation except hyphens and apostrophes), `createCaptionMerger(clock)` with a 400 ms window per text, the `CaptionEvent` type `{ id, text, quiet }`.
  - Create `tests/unit/audio/captions.test.ts`: each rule fails alone, the merge window edge (399 and 400 ms), a different text is never dropped.
  - Files: `src/audio/captions.ts`, `tests/unit/audio/captions.test.ts`
  - Covers: R11, R18, R19, A3.
  - After: none.

- [x] 4. Add the focus curve
  - Create `src/audio/focus-curve.ts`: constants (9,000, 350, 0.35, 0.12), `focusFrequency(from, to, duration, t)` on a log axis, `focusCurveSamples(from, to, count)`.
  - Create `tests/unit/audio/focus-curve.test.ts`: ends exact, midpoint, clamping outside the range.
  - Files: `src/audio/focus-curve.ts`, `tests/unit/audio/focus-curve.test.ts`
  - Covers: R21, A6.
  - After: none.

- [x] 5. Add the noise generators
  - Create `src/audio/noise.ts`: `whiteNoise`, `pinkNoise`, `brownNoise` returning `Float32Array` from a seeded generator (import `createRng` and the `Rng` type from `src/engine/index.ts` only).
  - Create `tests/unit/audio/noise.test.ts`: same seed same bytes, different seed differs, values in range, brown noise has more low-frequency energy than white.
  - Files: `src/audio/noise.ts`, `tests/unit/audio/noise.test.ts`
  - Covers: R9, R13.
  - After: none.

- [x] 6. Add the analysis helpers
  - Create `src/audio/analysis.ts`: `peak`, `peakDb`, `rms`, `rmsDb`, `dcOffset`, `isFinite` check, `fft` (power of two), `spectrum`, `centroid`, `bandEnergyDb`, `partialPeaks(freqs)`, `decayTime`, `lengthAbove(threshold)`, `modulationRate`, `crestFactorDb`, `rmsEnvelope`. No DOM.
  - Create `tests/unit/audio/analysis.test.ts`: a known sine gives its frequency, centroid and RMS; silence; a decaying sine gives its decay time; an amplitude-modulated tone gives its rate.
  - Files: `src/audio/analysis.ts`, `tests/unit/audio/analysis.test.ts`
  - Covers: R5, R14.
  - After: none.

- [x] 7. Add the schemas and types
  - Create `src/audio/schema.ts`: zod 4 schemas and inferred types for `VoiceId` (the 26 voices of requirement R13), `Bus` (`world`, `stinger`), `Step`, `Event`, `BedLayer`, `SoundSet` (`room`, `beds`, `events`, `needsSample`), `CaptionEvent`, `GLOBAL_EVENT_IDS` (the seven), and the ranges from design.md Decisions 4.
  - Create `tests/unit/audio/schema.test.ts`: a valid set passes; each broken field fails.
  - Files: `src/audio/schema.ts`, `tests/unit/audio/schema.test.ts`
  - Covers: R10, R12, R15.
  - After: none.

- [x] 8. Add the room impulse
  - Create `src/audio/impulse.ts`: `generateImpulse(seconds, sampleRate, rng)` (decaying noise, early reflections, low-pass that closes over time), `ROOM_SECONDS` for the seven chapters.
  - Create `tests/unit/audio/impulse.test.ts`: finite, length, decay time (via `analysis.ts`) within 25% of `seconds` for each chapter value, same seed same impulse.
  - Files: `src/audio/impulse.ts`, `tests/unit/audio/impulse.test.ts`
  - Covers: R13, R14.
  - After: 5, 6.

## Data (run together where Files differ)

- [x] 9. Add the voice defaults
  - Create `src/audio/voices/defaults.json`: the named numbers for every voice (design.md "How each voice recipe is parameterised"), each with a `trimDb`.
  - Create `src/audio/voices/params.ts`: the required key list per voice, `settingsFor(voice, overrides)`, the zod check of the file.
  - Create `tests/unit/audio/voice-params.test.ts`: every voice has all its keys, all values finite, overrides win, unknown keys are rejected.
  - Files: `src/audio/voices/defaults.json`, `src/audio/voices/params.ts`, `tests/unit/audio/voice-params.test.ts`
  - Covers: R13.
  - After: 7.

- [x] 10. Add the porch, foyer and chapel sets
  - Create `src/audio/sets/porch.json`, `foyer.json`, `chapel.json` with `room`, `beds`, `events` (the seven global events plus the chapter events), `needsSample`, one caption each, every `sample` null, as the brief's section 6 tables say.
  - Files: `src/audio/sets/porch.json`, `src/audio/sets/foyer.json`, `src/audio/sets/chapel.json`
  - Covers: R15, R16, R17, R18.
  - After: 7, 9.

- [x] 11. Add the gallery and library sets
  - Create `src/audio/sets/gallery.json` and `library.json` in the same way (library's repair is a softened `chime`).
  - Files: `src/audio/sets/gallery.json`, `src/audio/sets/library.json`
  - Covers: R15, R16, R17, R18.
  - After: 7, 9.

- [x] 12. Add the attic and finale sets
  - Create `src/audio/sets/attic.json` (the `riser` event is the `riser` voice over a rising `drone`) and `finale.json` (a distant `church-bell`, then a rising `chord`).
  - Files: `src/audio/sets/attic.json`, `src/audio/sets/finale.json`
  - Covers: R15, R16, R17, R18.
  - After: 7, 9.

- [x] 13. Add the set lookup
  - Create `src/audio/sets/index.ts`: imports the seven JSON files, parses each with the schema, exports `SOUND_SETS` keyed by chapter id and `getSet(chapter)`.
  - Create `tests/unit/audio/sets.test.ts`: all seven parse, `getSet` for every chapter id from `CHAPTER_IDS`, every voice named exists in the defaults.
  - Files: `src/audio/sets/index.ts`, `tests/unit/audio/sets.test.ts`
  - Covers: R12, R15.
  - After: 7, 9, 10, 11, 12.

- [x] 14. Add the loader plan
  - Create `src/audio/loader.ts`: `loaderPlan(chapter, enabled, sets)` (empty when not enabled), `loadSamples(plan, fetchFn)` taking `fetch` as an argument.
  - Create `tests/unit/audio/loader.test.ts`: fixture sets with sample ids, empty plan when disabled, plan limited to one chapter plus shared ids, a fake fetch is called only for plan entries.
  - Files: `src/audio/loader.ts`, `tests/unit/audio/loader.test.ts`
  - Covers: R9, R10, R22, A7.
  - After: 7, 13.

## Properties (Node)

- [x] 15. Add the test tables
  - Create `tests/property/audio/tables.ts`: the test's own copy of the section 6 tables (chapter, beds with loop seconds, chapter events, repair stinger, `needsSample`, room seconds, the seven global events).
  - Files: `tests/property/audio/tables.ts`
  - Covers: A4, A5.
  - After: none.

- [x] 16. Add the property predicates
  - Create `tests/property/audio/props.ts`: predicates that take the implementation under test as an argument (limiter, merger, variation, focus curve, loader plan, set checks), so mutants can pass a broken copy. Also the arbitraries for seeds, peaks and caption sequences.
  - Files: `tests/property/audio/props.ts`
  - Covers: R24.
  - After: 1, 2, 3, 4, 7, 13, 14, 15.

- [x] 17. Property A1 (variation)
  - Create `tests/property/audio/a1-variation.test.ts` using `fcParams` from `tests/property/fc-config.ts`.
  - Files: `tests/property/audio/a1-variation.test.ts`
  - Covers: R24, A1.
  - After: 2, 16.

- [x] 18. Property A2 (mix)
  - Create `tests/property/audio/a2-mix.test.ts`: dB round trip; the limiter model stays at or below the ceiling for any list of peaks.
  - Files: `tests/property/audio/a2-mix.test.ts`
  - Covers: R24, A2.
  - After: 1, 16.

- [x] 19. Property A3 (captions)
  - Create `tests/property/audio/a3-captions.test.ts`: no two identical captions within 400 ms, no distinct caption dropped, every generated valid caption obeys the rules.
  - Files: `tests/property/audio/a3-captions.test.ts`
  - Covers: R24, A3.
  - After: 3, 16.

- [x] 20. Property A4 (coverage)
  - Create `tests/property/audio/a4-coverage.test.ts`: compare every set with `tables.ts`; one caption per event and layer; no orphan caption; exact event lists; `needsSample` match. Use `fc.constantFrom` over chapters with at least 200 runs.
  - Files: `tests/property/audio/a4-coverage.test.ts`
  - Covers: R16, R17, R18, R24, A4.
  - After: 13, 15, 16.

- [x] 21. Property A5 (set data)
  - Create `tests/property/audio/a5-sets.test.ts`: parse, ranges (levels, loop lengths, fades), at least two bed layers, distinct loop lengths, least common multiple at least 300 s, room seconds equal the table.
  - Files: `tests/property/audio/a5-sets.test.ts`
  - Covers: R15, R24, A5.
  - After: 13, 15, 16.

- [x] 22. Property A6 (focus curve)
  - Create `tests/property/audio/a6-focus.test.ts`: monotone, exact ends, within 350 to 9,000 Hz for any from, to and time.
  - Files: `tests/property/audio/a6-focus.test.ts`
  - Covers: R21, R24, A6.
  - After: 4, 16.

- [x] 23. Property A7 (loader plan)
  - Create `tests/property/audio/a7-loader.test.ts`: generated fixture sets, plan holds only that chapter's and the shared ids, empty when `enabled` is false.
  - Files: `tests/property/audio/a7-loader.test.ts`
  - Covers: R22, R24, A7.
  - After: 14, 16.

## Mutants

- [x] 24. Add nine mutants
  - Create `tests/property/audio/mutants.test.ts`: each mutant passes a broken implementation to the predicate in `props.ts` and expects it to fail: limiter ceiling 0 dBFS (A2); merger that drops a distinct caption (A3); variation that allows 6% (A1); focus curve that overshoots below 350 Hz (A6); loader that loads every chapter (A7); caption rule that allows 8 words (A3); a bed set with two equal loop lengths (A5); a chapter set with a single bed layer (A5); a one-shot 10 dB too loud (A5). The tenth mutant (manifest check accepts `CC-BY`) is task 58.
  - Files: `tests/property/audio/mutants.test.ts`
  - Covers: R25.
  - After: 17, 18, 19, 20, 21, 22, 23.

## Audio graph modules

- [x] 25. Add the voice interface and helpers
  - Create `src/audio/voices/types.ts`: the `VoiceBuild` type `(ctx, out, at, settings, rng) => { duration }`, `VOICE_REFERENCE_PEAK_DB` (-3).
  - Create `src/audio/voices/env.ts`: envelope helpers (`exponentialDecay`, `attackRelease`), `noiseSource(ctx, buffer, loop)`, `partial(ctx, out, freq, level, fade, at)`.
  - Files: `src/audio/voices/types.ts`, `src/audio/voices/env.ts`
  - Covers: R4, R13.
  - After: 1, 5, 7, 9.

- [x] 26. Add the bell voices
  - Create `src/audio/voices/partials.ts` (partial table builder) and `src/audio/voices/bells.ts`: `chime`, `glass-ring`, `clock-chime`, `church-bell`, `music-box`, all from named settings.
  - Files: `src/audio/voices/partials.ts`, `src/audio/voices/bells.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 27. Add the short voices
  - Create `src/audio/voices/percussive.ts`: `tap`, `clock-tick`, `drip`, `heartbeat`.
  - Files: `src/audio/voices/percussive.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 28. Add the ambient voices
  - Create `src/audio/voices/ambient.ts`: `wind`, `wind-gaps`, `room-tone`, `rain-roof`; each drifting modulator has a period that divides the loop length.
  - Files: `src/audio/voices/ambient.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 29. Add the texture voices
  - Create `src/audio/voices/texture.ts`: `fire`, `murmur`, `thunder`.
  - Files: `src/audio/voices/texture.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 30. Add the gesture voices
  - Create `src/audio/voices/gesture.ts`: `breath`, `whoosh`, `chord` (with `rise`).
  - Files: `src/audio/voices/gesture.ts`
  - Covers: R13, R14, R21.
  - After: 25.

- [x] 31. Add the mechanical voices
  - Create `src/audio/voices/mechanical.ts`: `floor-creak` and `door-creak` (one recipe), `big-door`, `chains`, `bars`.
  - Files: `src/audio/voices/mechanical.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 32. Add the score voices
  - Create `src/audio/voices/score.ts`: `drone`, `riser`.
  - Files: `src/audio/voices/score.ts`
  - Covers: R13, R14.
  - After: 25.

- [x] 33. Add the voice registry
  - Create `src/audio/voices/index.ts`: maps every `VoiceId` to its build function; a type check makes a missing voice a compile error.
  - Create `tests/unit/audio/voice-registry.test.ts`: every id from the schema is in the registry and in the defaults.
  - Files: `src/audio/voices/index.ts`, `tests/unit/audio/voice-registry.test.ts`
  - Covers: R13.
  - After: 26, 27, 28, 29, 30, 31, 32.

- [x] 34. Add the room send
  - Create `src/audio/graph/room.ts`: builds a `ConvolverNode` from `generateImpulse` for a chapter's room seconds, with a wet gain; rebuilds on `setChapter`.
  - Files: `src/audio/graph/room.ts`
  - Covers: R13, R14.
  - After: 8, 25.

- [x] 35. Add the master chain and buses
  - Create `src/audio/graph/chain.ts`: `createChain(ctx)` with `bedsBus`, `breathBus`, `worldBus`, focus filter (9,000 Hz low-pass), `stingerBus`, room send, master gain, compressor (-6 dB, knee 0, 20:1, 3 ms, 120 ms), `WaveShaperNode` (curve from `softClipCurve`, `4x` oversample); `setMaster`, `closeFocus(at)`, `openFocus(at)` using `focusCurveSamples`.
  - Files: `src/audio/graph/chain.ts`
  - Covers: R7, R8, R21.
  - After: 1, 4, 34.

- [x] 36. Add the bed layers
  - Create `src/audio/graph/beds.ts`: start and stop a layer with its fades, per-layer loop buffers, the 3 s cross-fade on chapter change, one caption call when a layer starts.
  - Files: `src/audio/graph/beds.ts`
  - Covers: R20, R11.
  - After: 5, 7, 33, 35.

- [x] 37. Add event playing
  - Create `src/audio/graph/play.ts`: resolve an event's steps, apply `vary`, apply `levelDb + 9` gain, route to the bus, raise the caption through the merger, run the focus actions for `light-dies` (filter close, beds down 6 dB, 0.4 s silence, breath up 8 dB), `repair` (filter opens in 0.12 s, stinger) and `ghost-release` (whoosh, soft chord, breath thins to a tone).
  - Files: `src/audio/graph/play.ts`
  - Covers: R11, R17, R20, R21.
  - After: 2, 3, 13, 33, 35, 36.

- [x] 38. Add the public API
  - Create `src/audio/audio.ts` (`createAudio`: `enable`, `disable` with a 0.2 s fade and suspend, `setChapter`, `setFocusState`, `play`, `setMaster`, `onCaption`, `state`, `dispose`; options seed, `createContext`, `clock`, optional `tuning`), `src/audio/null.ts` (`nullAudio`) and `src/audio/index.ts` (the only public entry; exports types and the two factories). No context exists before `enable()`.
  - Files: `src/audio/audio.ts`, `src/audio/null.ts`, `src/audio/index.ts`
  - Covers: R6, R9, R22.
  - After: 14, 37.

## Lab

- [x] 39. Add the tuning drawer
  - Create `labs/sound/tuning.ts`: active only with `?tune=1`; a slider for each number in `voices/defaults.json`, "Copy sound JSON", values in `sessionStorage` under `kg-sound-tune`, exports the `tuning` map for `createAudio`. Real labels, visible focus, no colour-only meaning.
  - Files: `labs/sound/tuning.ts`
  - Covers: R26.
  - After: 38.

- [x] 40. Add the lab page and style
  - Create `labs/sound/index.html` and `labs/sound/lab.css`: skip link, main landmark, "Turn sound on", master level slider, chapter picker, a list for voice and event "Play" buttons with a caption area, beds with start and stop, "Break the light", "Restore the light", a labelled text peak meter, "Press Tab to hear ticks". Visible `:focus-visible` styles; never `outline: none`.
  - Files: `labs/sound/index.html`, `labs/sound/lab.css`
  - Covers: R26.
  - After: 38.

- [x] 41. Add the lab script
  - Create `labs/sound/lab.ts`: wires the page to `createAudio` (the click on "Turn sound on" calls `enable()`), shows captions from `onCaption` in a polite live region, runs Break and Restore through `setFocusState` and `play("light-dies")`, `play("repair")`, updates the peak meter from an `AnalyserNode` read on animation frames, plays a tick on each Tab key press in the lab area (the player's own key; no simulated keys). Nothing plays on load, hover or focus alone.
  - Files: `labs/sound/lab.ts`
  - Covers: R6, R26.
  - After: 39, 40.

- [x] 42. Add the production-build trace test
  - Create `tests/fixtures/audio/build-entry.ts` (imports all of `src/audio`) and `tests/unit/audio/build-trace.test.ts`: builds the entry with Vite's `build` API in Node into a temporary folder, then searches the output for `labs/sound`, `tune=1`, `Copy sound JSON`, `kg-sound-tune` and `__sound`; none may appear. Starts no browser and no server.
  - Files: `tests/fixtures/audio/build-entry.ts`, `tests/unit/audio/build-trace.test.ts`
  - Covers: R26, R29.
  - After: 38, 41.

## Browser suites (one lane on port 5185)

- [x] 43. Add the browser helpers
  - Create `tests/e2e/audio/helpers.ts`: `loadAudioModule(page)` (imports `/keyboard-ghosts/src/audio/index.ts` and `analysis.ts` inside `page.evaluate`), `renderVoice(id, seed, settings)` and `renderEvent` helpers that render with `OfflineAudioContext` and return numbers or a hash, never raw buffers. This task creates the file and starts no browser.
  - Files: `tests/e2e/audio/helpers.ts`
  - Covers: R5, R29.
  - After: 6, 38.

- [x] 44. Property B1 (voices render finite)
  - Create `tests/e2e/audio/b1-voices-finite.spec.ts`: every voice and the `room` impulse is finite, not silent, peaks at or below the ceiling, DC offset under 0.01. Fix voice code if a voice fails.
  - Files: `tests/e2e/audio/b1-voices-finite.spec.ts`, `src/audio/voices/*.ts`
  - Covers: R13, R14, B1.
  - After: 33, 43, 41.

- [x] 45. Property B2 (voice targets)
  - Create `tests/e2e/audio/b2-voice-targets.spec.ts`: each voice against its section 5 target (length, centroid, partial peaks, envelope, decay, modulation). Adjust `defaults.json` numbers and voice code if a target fails. Record any wide-tolerance choice in design.md.
  - Files: `tests/e2e/audio/b2-voice-targets.spec.ts`, `src/audio/voices/defaults.json`, `src/audio/voices/*.ts`
  - Covers: R14, B2.
  - After: 44.

- [x] 46. Property B3 (focus filter)
  - Create `tests/e2e/audio/b3-focus.spec.ts`: pink noise through the chain is at least 20 dB quieter above 2 kHz in `dim` than in `lit`; the repair chime is unchanged; after `light-dies` the window 0.1 to 0.35 s is at least 12 dB under the breath's peak (rendered with no beds). Fix `chain.ts` or `play.ts` if needed.
  - Files: `tests/e2e/audio/b3-focus.spec.ts`, `src/audio/graph/chain.ts`, `src/audio/graph/play.ts`
  - Covers: R8, R21, B3.
  - After: 45.

- [x] 47. Property B4 (limiter)
  - Create `tests/e2e/audio/b4-limiter.spec.ts`: every voice and every chapter's beds at once, master at default and at 0 dB, peak at most -1 dBFS plus 0.1 dB. Fix `chain.ts` if needed.
  - Files: `tests/e2e/audio/b4-limiter.spec.ts`, `src/audio/graph/chain.ts`
  - Covers: R7, B4.
  - After: 46.

- [x] 48. Property B5 (determinism)
  - Create `tests/e2e/audio/b5-determinism.spec.ts`: same seed gives equal buffer hashes for every voice and a full chapter render; a different seed gives different hashes.
  - Files: `tests/e2e/audio/b5-determinism.spec.ts`, `src/audio/voices/*.ts`
  - Covers: R9, B5.
  - After: 47.

- [x] 49. Property B6 (safety)
  - Create `tests/e2e/audio/b6-safety.spec.ts`: an init script counts `AudioContext` and `OfflineAudioContext` constructions. Before `enable()` the count is 0 and nothing is scheduled; hover and focus alone start nothing; one click on "Turn sound on" in the lab gives exactly one context that reaches `running` (if headless Chrome cannot, test only the count and say so in design.md under "Correctness Properties"); `disable()` suspends it.
  - Files: `tests/e2e/audio/b6-safety.spec.ts`, `.kiro/specs/audio-engine/design.md`
  - Covers: R6, B6.
  - After: 48.

- [x] 50. Property B7 (levels)
  - Create `tests/e2e/audio/b7-levels.spec.ts`: variation off, master -6 dB: every one-shot -14 to -10 dBFS peak (1.5 dB tolerance), tab tick -26 (2 dB), stingers -9 (1.5 dB), each chapter's beds together -30 dBFS RMS (3 dB) over 10 s after the fades. Adjust `trimDb` and set levels if needed.
  - Files: `tests/e2e/audio/b7-levels.spec.ts`, `src/audio/voices/defaults.json`, `src/audio/sets/*.json`
  - Covers: R20, B7.
  - After: 49.

- [x] 51. Lab test
  - Create `tests/e2e/audio/lab.spec.ts`: the lab loads; the skip link works; Tab reaches every control with a visible focus style; no keyboard trap; "Play" shows its caption in the live region; Break and Restore change the focus state in `state()`; the `?tune=1` drawer appears only with that flag; axe-core reports 0 violations (axe loaded from `node_modules/axe-core` into the page).
  - Files: `tests/e2e/audio/lab.spec.ts`, `labs/sound/lab.ts`, `labs/sound/lab.css`, `labs/sound/index.html`, `labs/sound/tuning.ts`
  - Covers: R26, R29.
  - After: 41, 50.

## Render tool and review loop (browser lane)

- [x] 52. Add the render tool
  - Create `tools/sound/render.ts`: a plain Node script (`node --experimental-strip-types tools/sound/render.ts`). It starts Vite's dev server on port 5185 (`strictPort`), opens Chrome through `chromium` from `@playwright/test`, renders every voice offline in the page, writes WAV files to `.local/sound/`, draws a spectrogram per voice on a canvas and saves it as `docs/evidence/sound/<voice>.png`, prints a table of measured numbers against targets, and stops the server and browser even on failure. It imports nothing from `src`. Run it once and keep the output.
  - Files: `tools/sound/render.ts`, `docs/evidence/sound/*.png`
  - Covers: R27, R29.
  - After: 51.

- [x] 53. Review round 1
  - View each spectrogram and the table. Check: a bell shows separate decaying partial lines; the breath swells then thins; wind is a moving band, not a hiss; room tails look like smooth decays; creaks show a wandering pitch; nothing is clipped. Fix what fails in the voice code or `defaults.json`, render again, and write round 1 in `docs/evidence/sound/REVIEW.md` (what changed, what is still weak, "needs the owner's ears"). If images cannot be opened, say so plainly in `REVIEW.md` and stop this task.
  - Files: `docs/evidence/sound/REVIEW.md`, `docs/evidence/sound/*.png`, `src/audio/voices/defaults.json`, `src/audio/voices/*.ts`
  - Covers: R28.
  - After: 52.

- [x] 54. Review round 2
  - Repeat task 53 for the items still weak. This is the last round. Write round 2 in `REVIEW.md`. Re-run the B1, B2, B4 and B7 specs after any change.
  - Files: `docs/evidence/sound/REVIEW.md`, `docs/evidence/sound/*.png`, `src/audio/voices/defaults.json`, `src/audio/voices/*.ts`
  - Covers: R28.
  - After: 53.

## Asset check

- [x] 55. Add the asset-check fixtures
  - Create `tests/fixtures/audio/manifests/`: one valid manifest and one fixture per broken rule (file without entry, entry without file, licence `CC-BY`, missing proof file, bad caption, unknown sample id), each with a small file list and its expected message.
  - Files: `tests/fixtures/audio/manifests/*.json`
  - Covers: R23.
  - After: 3.

- [x] 56. Extend the asset check
  - Edit `scripts/check-assets.mjs`: keep it a Node script run by `npm run check`; export `validateManifest(manifest, ctx)` and `captionRuleErrors(text)`; run the checks only when started as a script. Rules: path of the form `assets/sounds/<chapter>/<need>-<short-name>.<ext>`, licence in `CC0`, `public-domain`, `original-code`, proof file exists under `assets/licences/`, caption follows the rules, file without entry fails, entry without file fails, a sample id named by a sound set must be in the manifest. Keep `assets/manifest.json` as `{"assets": []}`.
  - Files: `scripts/check-assets.mjs`, `assets/manifest.json`
  - Covers: R23.
  - After: 13, 55.

- [x] 57. Property A8 (asset rules)
  - Create `tests/property/audio/assets-props.ts` (predicate that takes the validator) and `tests/property/audio/a8-assets.test.ts`: a valid manifest passes; an entry broken in exactly one rule fails with the matching message. Create `tests/unit/audio/check-assets.test.ts`: each fixture from task 55 gives its expected message, and `captionRuleErrors` agrees with `isValidCaption` on a list of strings.
  - Files: `tests/property/audio/assets-props.ts`, `tests/property/audio/a8-assets.test.ts`, `tests/unit/audio/check-assets.test.ts`
  - Covers: R23, R24, A8.
  - After: 3, 55, 56.

- [x] 58. Add the tenth mutant
  - Create `tests/property/audio/mutants-assets.test.ts`: a manifest check that accepts `CC-BY` is shown to fail A8.
  - Files: `tests/property/audio/mutants-assets.test.ts`
  - Covers: R25.
  - After: 24, 57.

## Shared files (one task each)

- [x] 59. Update tsconfig
  - Set `include` in `tsconfig.json` to exactly `["src","tests","labs","tools","vite.config.ts","playwright.config.ts"]`. Run `npm run typecheck`. Fix type errors in the audio files, which are all finished by now.
  - Files: `tsconfig.json`, `labs/sound/lab.ts`, `labs/sound/tuning.ts`, `tools/sound/render.ts`, `src/audio/**`, `tests/**/audio/**`
  - Covers: R3.
  - After: 54, 58.

- [x] 60. Add the audio lint rules
  - Edit `eslint.config.js` in one change: for `src/audio/**`, forbid `Math.random`, `Date`, `performance`, `setTimeout`, `setInterval`, `document`, `window`, and imports from `src/fx`, `src/ui`, `src/checks`, `src/hunt`, and from `src/engine` except `src/engine/index.ts`. Do not touch other rules. Run `npm run lint` and fix findings in `src/audio/**`.
  - Files: `eslint.config.js`, `src/audio/**`
  - Covers: R9.
  - After: 54, 59.

## Docs and log

- [x] 61. Write the audio docs
  - Create `docs/architecture/audio.md`: diagram of the buses and the focus filter, the API, the event and caption table, the sound-set format, the "needs a sample" list, how to tune in the lab (`?tune=1`, "Copy sound JSON"), the exact render command, the browser lane and the port. Add text about the engine only to `ATTRIBUTION.md` (everything is code-made, no recordings yet).
  - Files: `docs/architecture/audio.md`, `ATTRIBUTION.md`
  - Covers: R2, R27, R31.
  - After: 54, 56.

- [x] 62. Write the log entry
  - Add one dated entry to `docs/KIRO_LOG.md`: counts of tasks, tests, properties, mutants, and surprises.
  - Files: `docs/KIRO_LOG.md`
  - Covers: R31.
  - After: 58, 60, 61.

## Final

- [x] 63. Run everything
  - Run `npm run format`, then `npm run check` (green), then again with `FC_SEED=1` and with `FC_SEED=2`, then `npm run build`, then every audio browser spec on port 5185 (`npx playwright test tests/e2e/audio`), when no other browser task is running. Confirm A1 to A8 and B1 to B7 pass, the 10 mutants fail their properties, and every voice meets its target. Then give the five-line final reply from brief §14.
  - Files: none (formatting may rewrite any file in the repo)
  - Covers: R30, R31.
  - After: 59, 60, 61, 62.
