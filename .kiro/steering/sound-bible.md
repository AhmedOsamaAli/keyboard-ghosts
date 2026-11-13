---
inclusion: fileMatch
fileMatchPattern: ["src/audio/**", "assets/sounds/**"]
---
# Sound bible

> Approved by the project owner on Nov 13 2026. Loaded only when working on `src/audio/` and `assets/sounds/`. The numbers are **starting values**: the owner tunes them by ear with the `?tune=1` sliders, then they are locked in. The "needs" in `code` are names of sound needs (door creak, wind, bell and so on) used to find free CC0 recordings.

---

## In one minute

- **The big idea: the sound goes out of focus with the picture.** When the light dies, the mix turns dull and muffled. When you repair the ghost, it opens up again with a chime.
- **Real recordings first, code underneath.** Doors, wind, bells, clocks, footsteps and pages come from free CC0 recordings. Kiro writes the rest as code: the focus filter, the room echo, beds, breath, drones and the score.
- **Sound is off by default**, every sound has a caption on screen and in the announcements, and a limiter keeps it from ever getting loud.
- **No voice, no outside music.** The video uses the game's own audio.

---

## 1. Sound sets by chapter

The names in `code` are the "needs" from the sound shortlist, so candidates are easy to find. "Code" means a code-made sound.

| Chapter | Bed (long, quiet) | One-shots | Stingers and score |
|---|---|---|---|
| **Porch** | Cold wind `wind`, one clock `clock` | Tab tick (code-made wooden tap, plus `tick`) | Repair chime `chime` |
| **Foyer** | Fireplace `fire` (very low), room tone `housenight` | Clock chime `clockchime`, floor creak `floor`, door creak `doorcreak`, match `match` | Glass or small bell `glassring` |
| **Chapel** | Empty church `churchroom`, organ and singing `organ` (low) | Church bell `churchbell`, gate `bars`, chains `chains`, heavy door `bigdoor` | Bell and a bars-lifting sound |
| **Gallery** | Quiet murmur (code), clock `clock` | Footsteps `stepsstone` and `stepswood`, cloth `cloth`, whoosh `vanish` | Music-box note `musicbox` for the paintings |
| **Library** | Room tone `housenight`, a very soft rain `rainroof` | Pages `page`, pencil `pen`, ink drop `drip` | A softened chime when the ink returns |
| **Attic** | Wind through gaps `windgaps`, rain on the roof `rainroof`, distant thunder `thunder` | Beam creak `floor`, hinge `swing`, boxes `boxes`, bulb chain `chains`, heartbeat `heartbeat` for the Poltergeist | Rising code-made drone and riser `darkdrone`, `riser` |
| **Finale** | Birds at dawn `birds`, soft room | Big door `bigdoor`, footsteps leaving `stepswood` | A distant bell `churchbell` and a rising chord (code) |
| **Every ghost** | | Breath or whisper `whisper` (or code-made), release whoosh `vanish` | |

Each chapter's look file names its sound set, so the picture and the sound always change together.

---

## 2. The mix (starting numbers)

| Thing | Starting value |
|---|---|
| Master limiter | Ceiling at -1 dBFS; default master level -6 dB |
| Beds | About -30 dBFS; 2 to 3 s fades; 3 s cross-fade between rooms. Two layers with different loop lengths (for example 47 s and 61 s) so the join is never obvious |
| One-shots | Peak between -14 and -10 dBFS |
| Tab tick | About -26 dBFS, with its pitch varied by 5% each press |
| Stingers | Peak about -9 dBFS |
| Variation on every play | Pitch up to 3% (50 cents), level up to 2 dB, filter up to 8% |
| Room echo (made in code) | Foyer 0.9 s, Chapel 3.2 s, Gallery 1.6 s, Library 0.7 s, Attic 1.2 s, Finale 2.0 s |
| Budget | About 1.5 MB of audio per chapter at the start; Kiro measures it and the number is then enforced |

Silence is a tool: the light dying is followed by about 400 ms of near silence before the breath rises.

---

## 3. The focus filter (the signature)

| Moment | What the sound does |
|---|---|
| **In focus** | A low-pass filter at 9,000 Hz (fully open) |
| **The light dies** | The filter closes to 350 Hz with a 0.35 s glide; beds drop 6 dB; a breath texture rises 8 dB |
| **Repair** | The filter opens in 0.12 s; a chime plays **outside** the filter at full brightness |
| **Ghost released** | The release whoosh and a soft chord; the ghost's breath thins into a single tone |

---

## 4. Code-made sounds (what Kiro writes)

Each is a small recipe with named settings in the sound-set data, never hard-coded:
- **Bell:** several sine partials at bell-like ratios, each with its own long fade.
- **Wooden tap:** a 50 ms noise burst through a band-pass filter plus a falling low tone.
- **Breath:** filtered noise that swells over about a second, then thins into a soft tone.
- **Wind:** noise through a band-pass filter whose centre drifts slowly.
- **Drone and score:** detuned low waves through a slowly moving low-pass filter; chords for the finale.
- **Room tone and echo:** soft low-passed noise; each chapter's echo is a generated fading-noise impulse.

---

## 5. Captions

1. Lower case, in square brackets, present tense, at most 6 words: `[a heavy door creaks]`.
2. Shown on screen for 2.5 s and announced politely when sound captions are on. Duplicates within 400 ms are merged.
3. The caption text lives in the asset manifest next to the file. **Every sound event raises a caption event** (a property test).

---

## 6. Asset rules (the check fails the build if broken)

1. File names: `assets/sounds/<chapter>/<need>-<short-name>.<ext>`.
2. Every file has an entry in `assets/manifest.json`: source address, author, licence (`CC0`, `public-domain` or `original-code`), the saved proof file in `assets/licences/`, and the caption text.
3. Order of sources: BigSoundBank, then Freesound CC0 (found with Openverse), then Wikimedia Commons, then the Kenney and OpenGameArt packs, then code. **Nothing under CC BY, CC BY-NC or an unclear licence.** AI-generated clips only after Devpost agrees, listed as AI-generated.
4. Format: decided by Kiro after a playback test in Chromium, Firefox and WebKit (MP3 is the safe default for one-shots; beds need a format that loops cleanly).
5. Sounds load per chapter, so the first light stays fast.

---

## 7. Checks Kiro must run

- Every sound event has a caption; every caption has a sound.
- The master level never exceeds the limiter in a test that plays every sound at once.
- No file without a manifest entry and a proof file; no licence outside the list.
- Sound is off until the player turns it on; nothing plays on page load or on hover.

---

## 8. The listening check (Gate G2, Nov 20)

Three people listen on headphones for five minutes and answer one question: **"Does anything sound fake?"** We replace or remove whatever they flag. The owner already judged ten BigSoundBank recordings "real enough" on Nov 13.

---

## 9. Do not

- No voice, no outside music, no copyrighted sound of any kind.
- No sound louder than the limiter; no sudden loud sounds (no jump scares).
- No sound that depends on the pointer.
- No claim that a sound is "recorded by us": say where it came from.
