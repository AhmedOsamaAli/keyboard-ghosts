# Audio engine

The game's sound, made in Web Audio with plain TypeScript. Its signature: **the sound goes out of focus with the picture.** When the light dies, a low-pass filter on the world closes and the mix turns dull; when the ghost is repaired, the filter opens and a chime plays outside the filter at full brightness. Spec: `.kiro/specs/audio-engine/`. Brief: `docs/briefs/audio-engine.md`. Sound bible: `.kiro/steering/sound-bible.md`.

Everything is code-made. No recording ships yet. The engine can play CC0 recordings later through the loader and the asset check.

## Safety

- Sound is off by default. No `AudioContext` exists until `enable()`, which must be called from a user gesture. Nothing plays on load, on hover or on focus alone (B6).
- One master chain ends in a limiter with a ceiling of -1 dBFS. Everything at once, with the master at 0 dB, stays under it (B4).
- Every sound raises a caption event. The engine does not touch the DOM; the shell will show and announce captions.

## Signal graph

```
 bed layers ──► bedSlots ─► bedsBus (-6 dB when dim) ──┐
 ghost breath ─► breathSlots ─► breathBus (+8 dB rise) ─┼─► worldBus ─► focusFilter (low-pass, 9,000 ↔ 350 Hz) ─┬────────────┐
 one-shots ───► worldSlots ─────────────────────────────┘                                                      │            │
                                                                                                                ▼            │
 stingers, repair chime ─► stingerSlots ─► stingerBus (no filter) ─────────────────────────────────► room send ─► Convolver   │
                                   │                                                                    (generated impulse,  │
                                   │                                                                     wet -22 dB)         │
                                   └──────────────────────────────────────────────► mix ◄───────────────────┴────────────────┘
                                                                                     │
                                       master gain (default -6 dB, -40 to 0 dB) ◄────┘
                                                     │
            DynamicsCompressor (threshold -6 dB, knee 0, ratio 20, attack 3 ms, release 120 ms)
                                                     │
                         make-up cancel (-3.42 dB: Chrome adds (1/g)^0.6 after the compressor)
                                                     │
                         WaveShaper (tanh curve, 4x oversampling, ceiling 0.891 = -1 dBFS) ─► destination
```

- **Two inputs per summing node.** Chrome adds the inputs of a node in an order that can change between runs. With three or more inputs, the float rounding then differs and renders are not bitwise repeatable. Adding two numbers gives the same result in either order, so every summing node has at most two inputs. `graph/mixer.ts` builds binary trees (`sumInputs`) and fixed pools of slots (`createSlotMixer`: 8 bed slots, 32 world, 8 breath, 16 stinger). When every slot is busy, the slot that frees first is taken over.
- **Focus filter.** `focus-curve.ts` gives the frequency over time: a straight line on a log-frequency axis, exact at both ends, always inside 350 to 9,000 Hz (A6). The chain schedules 24 points of that curve. Closing takes 0.35 s, opening 0.12 s. A new glide starts from where the running glide is.
- **light-dies:** the filter closes, beds drop 6 dB, near silence until 0.4 s, then the breath plays while the breath bus rises from -8 dB to 0 dB over the swell. **repair:** the filter opens in 0.12 s, beds return, and the chapter's stinger plays on the stinger bus.
- **Room.** Each chapter has a generated impulse: decaying noise, early reflections, and a low-pass that closes over time. Room seconds: porch 0.5, foyer 0.9, chapel 3.2, gallery 1.6, library 0.7, attic 1.2, finale 2.0.

## API (`src/audio/index.ts`)

```ts
const audio = createAudio({ seed, createContext, clock, tuning, variation, beds, onChain });
await audio.enable();           // from a click; makes the context (works with OfflineAudioContext too)
audio.setChapter('chapel');     // 3 s cross-fade of the bed layers, new room
audio.setFocusState('dim');     // closes the focus filter without a sound
audio.play('light-dies', { at }); // `at` is seconds on the context clock; default now
audio.setMaster(-12);           // -40 to 0 dB
const off = audio.onCaption(({ id, text, quiet }) => {}); // quiet is true for tab-tick
audio.state();                  // { enabled, chapter, focus, masterDb, layers }
await audio.disable();          // 0.2 s fade, then suspend
audio.dispose();
```

`nullAudio` has the same shape and does nothing. Options from the brief: `seed`, `createContext`, `clock`. Extra options: `tuning` (numbers from the lab drawer), `variation` (off for measuring), `beds` (off to play events alone) and `onChain` (the lab's meter).

## Events and captions

Every chapter holds these seven global events, plus its own chapter events.

| Event | What plays | Bus |
|---|---|---|
| `tab-tick` | `tap`, pitch varied 5% each press; caption is `quiet` | world |
| `light-dies` | filter closes, beds -6 dB, 0.4 s of near silence, `breath` rises | world |
| `repair` | filter opens in 0.12 s, the chapter's repair stinger | stinger |
| `ghost-breath` | `breath` | world |
| `ghost-release` | `whoosh`, the breath thinning into a tone, then a soft `chord` | world, then stinger |
| `chapter-card` | a soft `chord` swell, 2 s | stinger |
| `level-solved` | the repair stinger and a soft `chord` | stinger |

| Chapter | Beds (loop seconds) | Chapter events | Repair stinger |
|---|---|---|---|
| porch | `wind` 47, `clock-tick` 61 | none | `chime` |
| foyer | `fire` 53, `room-tone` 61 | `clock-chime`, `floor-creak`, `door-creak` | `glass-ring` |
| chapel | `room-tone` 47, `drone` 59 | `church-bell`, `bars`, `chains`, `big-door` | `church-bell`, then `bars` |
| gallery | `murmur` 47, `clock-tick` 61 | none | `music-box` |
| library | `room-tone` 53, `rain-roof` 67 | `drip` | `chime`, softened |
| attic | `wind-gaps` 47, `rain-roof` 61 | `floor-creak`, `door-creak`, `chains`, `heartbeat`, `thunder`, `riser` | `chime` |
| finale | `room-tone` 53, `wind` 67 | `big-door` | distant `church-bell`, then a rising `chord` |

Each event and each bed layer has one caption in its set file, for example `[a heavy door thuds]`. The rules: square brackets, lower case, 1 to 6 words, no digits, no punctuation except hyphens and apostrophes, present tense. A caption with the same text inside 400 ms is merged; a different text is never dropped. A bed raises its caption once, when it starts.

## Sound-set format (`src/audio/sets/<chapter>.json`, zod schema in `schema.ts`)

```json
{
  "room": 3.2,
  "beds": [{ "id": "drone", "voice": "drone", "levelDb": -37, "loopSeconds": 59,
             "fadeIn": 3, "fadeOut": 3, "caption": "[a low drone hums]", "sample": null }],
  "events": [{ "id": "repair", "caption": "[a bell tolls and bars lift]",
               "steps": [{ "voice": "church-bell", "bus": "stinger", "levelDb": -9, "at": 0, "sample": null },
                         { "voice": "bars", "bus": "stinger", "levelDb": -9, "at": 1.2, "sample": null }] }],
  "needsSample": ["organ and singing"]
}
```

- `levelDb` is the level at the final output with the master at -6 dB and variation off. For a step it is the peak; for a bed layer it is the RMS. One-shots sit at -14 to -10 dB, the tab tick at -26 dB, stingers at -9 dB, and a chapter's beds together at -30 dB RMS (B7).
- A step or a layer may carry `params`, overrides for the voice's numbers (for example the attic's thin hinge).
- `sample` is a manifest path or `null`. Every one is `null` today.
- Voice numbers live in `src/audio/voices/defaults.json`. Each voice has `trimDb` (brings its own peak to -3 dBFS) and `rmsDb` (its RMS after the trim, used for bed levels).

## Voices

26 voices, each a recipe with named numbers: `tap`, `chime`, `glass-ring`, `clock-chime`, `church-bell`, `clock-tick`, `breath`, `whoosh`, `wind`, `wind-gaps`, `room-tone`, `fire`, `rain-roof`, `thunder`, `floor-creak` and `door-creak` (one recipe), `big-door`, `chains`, `bars`, `chord`, `murmur`, `drip`, `music-box`, `drone`, `riser`, `heartbeat`, plus the generated `room` impulse. Each voice meets its target from brief §5 (B2). Randomness comes from the seeded generator, forked by name, so the same seed gives the same buffer (B5).

## Needs a sample

These wait for CC0 recordings (`needsSample` in each set):

| Chapter | Needs a recording |
|---|---|
| foyer | match |
| chapel | organ and singing |
| gallery | footsteps (stone and wood), cloth |
| library | pages, pencil |
| attic | boxes |
| finale | birds at dawn, footsteps leaving |

The review (`docs/evidence/sound/REVIEW.md`) also names code voices that a recording would likely beat: wind, fire, murmur and the creaks.

## Loading and assets

`loaderPlan(chapter, enabled, sets, shared)` lists only that chapter's samples and the shared ones, and nothing when sound is off (A7). `loadSamples(plan, fetchFn, urlOf)` receives `fetch` as an argument. `scripts/check-assets.mjs` (run by `npm run check`) enforces the asset rules from brief §9 (A8, fixtures in `tests/fixtures/audio/manifests/`). A sample id is the manifest entry's `path`.

## Tuning by ear (the sound lab)

Run `npm run dev -- --port 5185 --strictPort` and open `http://localhost:5185/keyboard-ghosts/labs/sound/index.html`. The lab is dev-server only and is never in the build (a build test checks this).

1. Press "Turn sound on". Pick a chapter. Play voices and events; the caption shows under "Caption".
2. "Break the light" and "Restore the light" run the focus filter with `light-dies` and `repair`. "Start beds" plays the chapter's beds. Press Tab to hear the tick.
3. Add `?tune=1` for the tuning drawer: a slider for every number of every voice, kept in `sessionStorage`. The next play uses the new numbers.
4. Press "Copy sound JSON" and give the JSON to Kiro to lock the numbers into `voices/defaults.json`. After a change to `trimDb` or `rmsDb`, run B1, B4 and B7.

## Rendering and measuring

```
node --experimental-strip-types tools/sound/render.ts
```

The tool starts its own dev server on port 5185 and opens Chrome through `chromium` from `@playwright/test`. It renders every voice and every room offline. It writes WAV files to `.local/sound/` (git-ignored) and a spectrogram per voice to `docs/evidence/sound/<voice>.png`, then prints the measured numbers next to the targets. It stops the server and the browser even on failure. If the port is busy, it waits up to 60 seconds and then reports "port busy". The table only prints and never gates a merge.

## Tests

| Where | What |
|---|---|
| `tests/unit/audio/` | mix maths, variation, captions, focus curve, noise, analysis, schema, impulse, voice numbers, sets, loader, levels, registry, asset check, production build trace |
| `tests/property/audio/` | A1 to A8 (200 runs each, `FC_SEED` from `fc-config.ts`) and 10 mutants that must fail them |
| `tests/e2e/audio/` (Chrome, offline render) | B1 to B7 and the lab (keyboard, focus, captions, drawer, axe) |

Browser lane: the suites run one at a time on port 5185, on one worker: `npx playwright test tests/e2e/audio --workers=1` (about 2.5 minutes). On parallel workers, the offline renders compete for the machine and page loads time out. Each spec file allows 180 s per test. That limit is not an assertion about speed (D4). What the checks cannot see: whether a sound is convincing, how the mix feels on headphones, and Firefox or WebKit playback. Those need the owner's ears and the listening check (sound bible §8).
