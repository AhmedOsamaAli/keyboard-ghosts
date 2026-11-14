# Brief: film-look (spec 3b): the Foyer as a silent film

Owner decisions, written Nov 14 2026 (evening). Spec name: `film-look`. Branch: `feat/film`, in the worktree `C:\dev\kg-wt\fx` (port 5183, as before).
This brief answers every clarifying question. If something is missing, choose the simplest option and record it in design.md under "Decisions". If the spec documents ever disagree with this brief, follow the brief and note the difference in design.md. Where this brief and `.kiro/steering/look-bible.md` disagree, **this brief wins** for the Foyer and for the film layer: list every difference in design.md. The planner updates the look bible after the owner approves the pictures; do not edit it.

## 1. Why this exists

The owner opened the Foyer look lab and called it naive: ordinary website buttons, a "Privacy" link, flat vector shapes in one brown, "not the wow". They are right. The light engine (`src/fx`) is sound. What it lights is not. This spec changes **what the light falls on** and nothing else.

The owner chose direction **B, "Silent film"**, with the diegetic props of direction A inside it. The whole game is shot like a 1920s silent horror film (think Nosferatu, Caligari, Melies): hard light, black shapes, fog, tinted film stock, grain and wear, and the story told by title cards. Ordinary web parts (buttons, links, form fields, footer links) become objects in the house but stay real elements. The Finale is the first real colour of the whole game.

The owner judges by **pictures and the live lab** (`/keyboard-ghosts/labs/foyer/index.html`). The test: would a stranger who sees one still say "that is a frame from an old film", not "a website with a dark theme"? If not, it is not done.

## 2. Not in this spec

The living ghost (notice, plead, release states: a later spec), wiring into the shell, sound, the other chapters' scenes (only their tone data here), WebGL or shaders (direction C was rejected for now), new dependencies, new fonts, bitmap art or any image file (every picture is code: SVG, CSS, canvas), edits to `src/engine`, `src/ui`, `src/audio`, `levels/`, `spikes/`, `.kiro/steering/*` and `docs/decisions.md`. The seven e2e specs keep their intent: edit them only where the DOM changed, never to make a failure go away.

## 3. Files you own

`labs/foyer/**`, `src/fx/film/**` (new), additive edits in `src/fx/look/*`, `src/fx/controller.ts`, `src/fx/index.ts`, `src/fx/fx.css`, `src/fx/atmosphere.css`, `src/fx/atmo/*`, `src/fx/tune/*`, `looks/*.json`, `tests/unit/fx/**`, `tests/property/fx/**`, `tests/e2e/fx/**`, `tools/bench/*`, `docs/architecture/film.md`, additions to `docs/architecture/fx.md`, `docs/evidence/film/**`, `docs/KIRO_LOG.md`. The focus-guard hook blocks `outline: none` and `outline: 0` under `src/`; the same rule holds in `labs/`. Never work around it.

## 4. Decisions already made

1. **Direction:** silent film (B) with diegetic props (A) inside it. No WebGL.
2. **The page structure is frozen:** the same sections, ids, focusable elements and Tab order (the 30 stops). New things (ghost, title card, wear, bokeh) are `aria-hidden` additions. The props are the real elements, restyled.
3. **Everything is drawn in code.** System serif stack only (look bible section 5). Title cards use uppercase, wide letter spacing and SVG ornament. If a bundled font would clearly lift the card, record the candidate and its licence URL in REVIEW.md and do not add it here.
4. **All colour comes from tokens** defined by the look JSON (section 7). The lab CSS, SVG and film modules hold no colour literal, except black or white used only as an alpha mask.
5. **No colour until dawn.** Every hue in a chapter look lies on that chapter's tone ramp. The Finale's dawn ramp is the first real colour.
6. **Two kinds of film artifacts.** Scene wear (specks, scratches, weave, breath, pendulum) sits behind the content. Lens effects (grain, vignette, flicker, bloom: already built) stay above it. Scene wear never crosses text, controls or the focus ring.
7. **All ambient motion stops** under reduced motion, tier 1, tier 0, Lights On and a visible "Still" toggle in the lab rail (the shell will own the same switch later). Tier 1 keeps the static tonal art, with no moving wear.
8. **No motion follows the pointer. No flash above 3 per second.** F4 holds for every new moving layer.
9. **Tests never assert time** (docs/decisions.md D4). The manual clock (`?test=1`) steps everything, including the title card and the wear, which are seeded.
10. **Exact ends.** Every curve and blend returns its exact end values at t <= 0 and t >= 1 by an early return, never by luck. A property test found this flaw in `glide` on Nov 14 (it returned 1.1e-16 at t = 0).

## 5. The film language we copy

| Film trick | On screen | Where |
|---|---|---|
| Chiaroscuro | Real blacks and real whites. Light is the only thing that makes a shape visible | the hall |
| Split tone | Highlights in the chapter's tint (Foyer: amber cream), shadows in a cold near-black | the tone ramp |
| Iris | The lamp's pool of light is soft and round, and the film opens with an iris | lit region, title card |
| Intertitle | The story is told by title cards: a frame, spaced capitals, one short line | title card |
| Halation | Bright things bleed a soft glow | arch, flame, clock dial |
| Film wear | Grain, dust specks, hairline scratches, a tiny gate weave, slow flicker | film layer |
| Expressionist shadow | A few hard, angled shadows on the floor and wall | hall, ghost |
| Rack focus | already built | fx |
| Bokeh | Out-of-focus lights become soft discs, so the blur reads as a camera lens, not frosted glass | dim state |

## 6. The hall (the establishing shot)

The first screen of the lab (1280 by 720) must read as one composed shot, with depth, from back to front:

1. **Far wall.** The damask pattern shows only inside pools of light and falls to near black within about half the screen width.
2. **Wood panelling.** The lower 38% of the wall. Dark vertical planks, one thin highlight on each edge.
3. **The arched doorway: the key light.** Right of centre, about 24% of the width and 62% of the scene height. The inside is overexposed near-white amber (tone 4) with halation. The door leaf is ajar at an angle and cuts a slab of darkness out of the light.
4. **A light shaft** from the arch across the floor toward the lower left: a long trapezoid with soft edges, with dust motes in it (tier 2).
5. **Floor.** Tiles in perspective with the vanishing point inside the arch. Each row is darker toward the camera. A faint gloss streak lies under the arch.
6. **The grandfather clock** (left, about 15% of the width): a near-black silhouette, one thin rim of light on its right edge. The dial is a small bright disc, the only other true white. The pendulum swings slowly (section 10).
7. **Console table and candle** (right, front): the second light. The flame is small and bright; its pool is about 10% of the width and flickers.
8. **The ghost** (section 8), standing in the light shaft between the clock and the arch.
9. **Foreground framing.** Two blurred shapes at the left and right edges, a banister post and a curtain fold. They are 85% to 100% black and out of focus (6 to 10 px blur), so the shot has a frame and depth.
10. **Hard shadows.** The ghost, the clock and the table throw angular shadows across the floor toward the camera. At least two strong diagonals in the frame.

The hero text ("The hall is warm." and its line) sits low-left over the dark floor in the intertitle style: spaced letterpress heading with a soft glow, italic line. The text stays plain text.

**Value budget** (checked by V1 on the first screen at tier 2): at least 35% of pixels have relative luminance below 0.02; at least 1.2% are above 0.6; at most 30% fall between 0.05 and 0.30. These numbers stop a flat mid-brown frame. You may change them, with the reason, in design.md and REVIEW.md.

## 7. Tone ramp and tokens

Each look gets a `film` block in its JSON (additive; extend the zod schema, the tunables and the tuning panel; every new number has min, max, step and unit). It holds `ramp` (5 colours, luminance strictly rising), the wear numbers (section 10), `halation`, `bokeh` and `iris`. The art uses only these tokens: `--tone-0` to `--tone-4`, `--text`, `--ink`, `--light`. Register them with `@property` so they can transition; where `@property` is missing, swap instantly.

**Foyer ramp, starting values:** `#05070b` (cold near-black), `#17130e`, `#4a3a26`, `#c28f4a`, `#ffe6b8`. Text stays `#f4e6cf`. Shadows are cold, highlights are warm: that contrast is what the current brown lacks.

The other looks get a complete ramp from the look bible's "Grade notes" so the schema is whole: Chapel cold blue with violet in the dark; Gallery a deep red tint; Library green; Attic desaturated moon blue; **Finale the dawn colours** (first real colour: sky blue and gold); Lights On cream and ink. Only the Foyer is designed here, but the lab has a "Look" picker so the owner can flip the same hall into each tint (`?look=chapel`, and so on).

## 8. The ghost (one static figure)

The **Faceless** (story bible section 3: "a figure with an empty oval where a face should be"). One SVG silhouette, about 26% of the scene height. Pure `--tone-0` shape with a 2 px rim in `--tone-4` on the side that faces the arch. A draped figure: shoulders narrower than the hem, one hand raised palm out (a plea, never a threat), head slightly tilted, the oval face is a true hole through which the wall shows. Subtle fold streaks in `--tone-1` so it is not a flat blob. The hem dissolves into drifting motes. The edge has slow turbulence (3 px, 0.4 times a second, tier 2). It has no states in this spec, is `aria-hidden`, cannot be focused and takes no pointer events. No gore, no jump scare, nothing that moves toward the player.

## 9. Props: ordinary parts become objects

Every prop stays the real element with the same accessible name and visible text. A prop adds look, never behaviour.

| Today | Becomes | Rules |
|---|---|---|
| Lab rail (Menu, Break the ring, Restore the ring) | A slim projector-booth rail with brass toggle plates. New real controls: a "Look" picker, "Preview dawn", "Replay title card", "Still" | lab only; labels are real text |
| Site nav (4 links) | Four arched brass door plates with a keyhole and four screws. On focus the plate catches more light | link text unchanged |
| Hero heading and line | An intertitle on the wall: spaced capitals with a soft glow, italic line | text unchanged |
| Round candle button | A brass candle-holder disc | accessible name unchanged |
| Room cards (6) | Framed film stills on the wall, a brass nameplate, a faint diagonal glass glare | the picture is `aria-hidden`; captions unchanged |
| Guestbook form | A ledger on a reading table: a parchment page (tone 3 to 4, lit by the candle), ruled lines, labels above in ink. Inputs are ruled lines with a 3:1 boundary and a thicker underline on focus | label, for and ids unchanged |
| "Sign the book" button | A wax-seal disc, 64 px, with a stamp; the visible text "Sign the book" is on a ribbon | name unchanged |
| The cellar section | A stone arch with an iron ring | text unchanged |
| Footer links (3) | Three brass plaques screwed to the wall: "House rules", **"House notice" (was "Privacy")**, "Back to top" | this is the only copy change; update tests that name it |

Rules for all props: a target at least 44 by 44 CSS px; text contrast at least 4.5:1 on its plate; the focus ring is the fx's and is never replaced (a prop may add a state, such as lighter brass, but not a second ring); engraved text is real text with a `text-shadow`, never an image.

## 10. Film wear (starting values; each is a tunable in `?tune=1`)

| Layer | Where | Numbers |
|---|---|---|
| Grain | lens | 7% strength, 12 steps a second (built; raise from 5%) |
| Dust specks | scene wear | at most 5 spawn a second; each lives 1 or 2 frames at 12 frames a second; 1 to 3 px; opacity 0.3 to 0.6; half dark, half bright |
| Hairline scratches | scene wear | at most 0.4 spawn a second; 1 px wide; 15% to 45% of the scene height; opacity 0.2 to 0.4; live 0.2 to 0.5 s; drift at most 8 px a second |
| Gate weave | scene wear | the scene art group moves at most 1 px in x and y, at 6 steps a second; text and controls never move |
| Breath | scene wear | the scene art scales 1.000 to 1.020 over 24 s, ease in and out, alternating; nothing else moves |
| Pendulum | scene | 2.0 s period, plus or minus 6 degrees |
| Flicker | lens | the candle pool at most 6% amplitude and 2.5 a second; the arch glow at most 2% (F4 holds) |
| Dust motes | lens | 24 near the lit core (built) plus 40 in the light shaft; drift at most 6 px a second |
| Vignette | lens | 40%; tier 1 keeps it, static |
| Halation | scene | static glow, `mix-blend-mode: screen`: arch (radius 14% of the scene width, opacity 0.5), flame (3%, 0.6), clock dial (2%, 0.3) |

Wear is a pure, seeded scheduler `wearAt(seed, t)` with the caps above, drawn on one small canvas or a few DOM nodes, behind the content. Per frame, wear covers at most 0.05% of the viewport.

## 11. Light, focus and bokeh

- **The soft shape.** Round 0 of the first review found a faint rectangular band around wide lit elements and neighbour captions that were hard to read. Round 1 here must remove the visible rectangle. Allowed levers: a corner radius up to half the shorter side of the lit core (a stadium), wider and softer ramps in the data, a rounder bloom. F1 (the core holds the ring and its padding) and F2 (the 0.05 step limit) must still hold. Not allowed: hiding the ring or the element.
- **Bokeh.** While the scene is dimmed (darkness above 0.2), the three light sources (arch, candle flame, clock dial) show as soft discs: 48 to 64 px, 28 to 40 px and 24 to 32 px, opacity up to 0.35, a slightly brighter rim. They fade in with the blur. Tier 2 only, `aria-hidden`.
- **The lit element is the brightest thing in the frame** whenever the picture is dimmed. The blur and darkness numbers may be retuned for the darker scene (record them, as in the first review).
- **Drift and snap-back** work as built: when the ring is missing, the picture drifts out of focus and the light dies; the repair snaps back with the bloom.

## 12. Title card and iris

The Foyer card from the story bible: numeral "I.", title "THE FOYER", verb "See and name", line "The hall is warm. Nobody left a lamp on."

- **Look:** black, letterbox bars 12% top and bottom, a double-rule frame with art-deco corner ornaments in `--tone-3`, spaced capitals, grain and vignette on top.
- **Timeline** (normal): 0 to 500 ms fade in from black; the text fades in over 500 ms; the card holds until 2,700 ms with a slow push-in (scale 1.00 to 1.04); then the **iris opens** from the doorway: a circular mask grows from 0 to 150% of the diagonal in 700 ms (ease in and out) while the hall sharpens from 12 px of blur to 0 in the first 400 ms. Total 3,400 ms.
- **Reduced motion:** the card shows still for 1,500 ms, then fades out over 300 ms. No iris, no push-in.
- **Never blocks.** Any key press, click or touch ends the card at once and the key still does its normal job. The card is not modal and does not trap focus; the page behind it is reachable by Tab. The visual card is `aria-hidden`; its text is announced once through a polite live region.
- **API:** `playTitleCard(spec, options): Promise<void>` in `src/fx/film`, plus the pure `titleCardTimeline(spec, { reducedMotion })` that returns the phases `{ name, startMs, endMs }`. The shell will reuse it for every chapter.
- **In the lab:** plays at load; `?intro=0` and `?test=1` skip it; `?intro=1` forces it even under test (its own tests do). A rail button "Replay title card".

## 13. Tints, dawn and Lights On

- **Tints.** Because all colour is tokens, `?look=chapel`, `gallery`, `library`, `attic` and `finale` re-tone the same hall with no other change. The lab "Look" picker uses an additive `fx.setLook(id, { transitionMs })`.
- **Dawn.** The "Preview dawn" button calls `fx.setLook("finale", { transitionMs: 3000 })`: the tokens blend from amber and black to the dawn colours while the bloom warms. This is the "first colour in the whole game" payoff, so it must feel like an event. Reduced motion: instant. A pure `lookBlend(a, b, t)` (OKLab, monotone, exact at both ends, no overshoot) drives it.
- **Lights On** (a setting, tier 0): the house lights come up. Tokens switch to the `lights-on` ramp (cream paper, ink lines). No grain, specks, scratches, weave, breath, vignette, bokeh or halation. The arch is a plain doorway with a daylight window; the ghost is an ink outline filled pale; plaques are plain engraved plates. It is a designed daylight storybook with the same layout and the props still recognisable, never a bare fallback.

## 14. Tiers and the budget

| Tier | What it shows |
|---|---|
| 2 | everything: art, lens effects, scene wear, bokeh, halation, title card with iris |
| 1 | the static tonal art, halation and vignette; no blur, no grain, no motes, no moving wear; the title card is a plain fade |
| 0 | the plain, accessible page in the Lights On look |

The 1.5 s start-up probe must keep tier 2 on this PC in 3 of 3 normal runs. If the new art makes the probe drop to tier 1, simplify the art, not the probe. Rules: no SVG filter on the page root or on scrolling content; avoid `feTurbulence` on large or animated layers; prefer pre-made gradients and one small pre-rendered tile to live filters; cap the area of any `filter: blur`; use `will-change` sparingly. Run `tools/bench` before and after and record the numbers in REVIEW.md (they are reported, never gated: D4).

## 15. Hard rules

1. Text contrast at least 4.5:1 everywhere text sits (title, plates, ledger, captions), 3:1 for UI boundaries and the ring, in every look, tier and state.
2. The ring is never covered, blurred or crossed by wear. If the art behind it is bright, the ring needs a two-tone edge so it holds 3:1 on both light and dark.
3. Targets are at least 44 by 44 CSS px. Seals and plates have visible text that contains the accessible name.
4. 200% and 400% zoom and a 320 px width: no clipped prop, no horizontal scroll.
5. Forced colors: the page falls back to the plain tier-0 page.
6. No red-and-black flashing. No flash above 3 a second. Wear covers at most 0.05% of the viewport per frame.
7. All art is `aria-hidden`, not focusable, with `pointer-events: none`.
8. No `outline: none` or `outline: 0` anywhere.
9. Safe and kind: no gore, no jump scares, nothing sudden.

## 16. Properties and checks (fast-check, 200 runs, `tests/property/fc-config.ts`)

Node, no DOM:
- L1 Ramp: every look has a 5-colour ramp with strictly rising relative luminance; text on `ramp[0]` and `ramp[1]` meets 4.5:1; the Foyer's `ramp[0]` is blue-black (b above r) and `ramp[4]` is warm (r above b).
- L2 Wear caps: for any seed and any stepped 10-minute span, `wearAt` stays inside every cap of section 10, covers at most 0.05% of the viewport per frame, and never exceeds 3 luminance flashes a second (the same measure as F4).
- L3 Determinism: the same seed and time give the same wear; different seeds differ.
- L4 Title card: `titleCardTimeline` phases are contiguous and ordered; the total is 3,400 ms; the reduced-motion version has no moving phase and lasts at most 1,800 ms; a skip at any t gives the end state at once.
- L5 Exact ends: `lookBlend` and every curve are exactly `a` at t <= 0 and exactly `b` at t >= 1, monotone in luminance between, and never outside the ends.
- L6 Coverage: every look file has a complete `film` block; every tunable has min <= value <= max.
- L7 Token scan: no colour literal in `labs/foyer/**` or `src/fx/film/**` except black or white in alpha masks.
- L8 Intro never blocks: in the model, focusable content is reachable at t = 0 and a skip is always accepted.

Browser (Playwright in Chrome, one lane; statistics from screenshots, no golden images):
- V1 Value budget (section 6) on the first screen at 1280 by 720, tier 2, `?test=1`, manual clock at 8 s.
- V2 Contrast on rendered pixels: 12 text samples (title, line, 4 plates, 2 ledger labels, 2 footer plaques, one card caption) at least 4.5:1, lit and dim, tiers 2 and 1.
- V3 Focus: the Tab order equals the baseline (30 stops, same ids, same order); the ring is visible (3:1 against the surroundings at 8 sample points) on 10 stops.
- V4 Still: under reduced motion, `?tier=1`, `?tier=0`, `?lights=on` and the Still toggle, no film animation runs (`document.getAnimations()` holds none from the film layer) and the wear draws nothing in 2 s of manual clock.
- V5 Title card: plays at load; any key skips it; Tab reaches the page during it; under the manual clock the phase attributes are exact at 0.3, 1.2, 2.8 and 3.2 s.
- V6 axe: 0 violations on the title card, idle, focus, Lights On and tier 0.
- V7 Zoom and reflow: 200%, 400% and 320 px.
- V8 Build: the production fixture build (extended to import `src/fx/film`) has no lab, tuning panel, test hook or `window.__fx`.

## 17. Tests that prove the tests

At least 8 deliberate mutants, each shown to fail the matching check: a ramp that is not rising; a flicker rate of 4 a second; a weave of 3 px; wear that ignores Still; a title card that ignores a skip; a blend that overshoots; a colour literal that passes the token scan; a look file with no `film` block that passes coverage.

## 18. The review loop (pictures decide)

Reuse `tools/bench/capture-look.ts` (extend its states). Round 0 is a first look at four states (title card, idle, focus on the candle button, focus on the ledger input); then at most 3 more rounds. Each round: capture, **open every picture**, and write the round in `docs/evidence/film/REVIEW.md`: for each line below, pass, weak or fail, what changed, what is still weak. Fix the worst line first.

Pictures are PNG at 1280 by 720, plus one 1920 by 1080 per round; keep each round under 5 MB. States: title card; idle; idle scrolled to the rooms and ledger; focus on a door plate; on the candle button (ghost nearby); on the ledger; drift; snap-back; Lights On; tier 1; tier 0; the same hall in chapel, gallery, library, attic and finale tint; dawn half way.

The checklist:
1. First glance (idle): reads as a still from an old film. Real blacks and whites, a visible light shaft, a figure, grain, depth.
2. The hero text is legible and nothing needed is lost in shadow.
3. No stock button, link or field look remains (name each prop).
4. The ghost reads as a silhouette with a rim and an empty face, not a blob and not frightening.
5. Focus: the lit item is the star, the ring is clear, the rest sinks into soft dark with bokeh discs, and there is no rectangular band.
6. The title card feels like an intertitle: frame, capitals, letterbox.
7. The tint strip: each look reads as a different place by tint alone; the finale is the first colour.
8. Lights On is a designed daylight storybook, and the props are still themselves.
9. Tiers 1 and 0 still look deliberate.

At the end make `docs/evidence/film/contact-sheet.png` (8 key frames in a grid with captions) and `before-after.png` (the old `docs/evidence/look/round2/01-idle.png` beside the new idle). Say "needs the owner's eyes" where only the owner can judge. If you cannot open images, say so plainly and stop this task.

## 19. Rules for tasks.md

- No task is optional: no `*` markers, including every property, mutant and e2e test.
- **Every task has an "After: <task numbers>" line and a "Files:" line.** Two tasks run together only when neither names the other and they share no file. Where tasks in different groups edit the same file, the later one names the earlier one.
- **Task 1 (two parts, before anything else):** (a) Fix a real bug. `tests/property/fx/f3-curves.test.ts` "glide starts at 0 and ends at 1" fails about 1 run in 8 on random seeds (seeds 419463688 and 1566833186): for overshoot 0.02, `glide(0, look)` returns 1.1102230246251565e-16 instead of exactly 0. Make `glide` return exactly 0 for t <= 0 and exactly 1 for t >= 1 by an early return. Check every other function in `src/fx/math/*.ts` whose property says "exactly 0" or "exactly 1" at an end. Add a regression `examples` entry (overshoot 0.02, glide.ms 100) and a unit test over overshoot 0.01 to 0.15 in steps of 0.01. If it is already fixed, only add the checks. (b) Switch the fx property tests (`tests/property/fx/*`) to the shared `tests/property/fc-config.ts` (200 runs, `FC_SEED`), keep F1 to F9 green, and run them with `FC_SEED` unset, 1, 2 and 3, and with 30 different values of `FC_SEED`. If `fc-config.ts` is missing, stop and say so.
- **Browser lane:** every task that starts the dev server, Playwright or a browser forms one chain on port 5183, one at a time, each naming the one before it. A lane task stops every server and browser it starts, even on failure (a `finally` block). If port 5183 is busy it waits up to 60 seconds, then reports "port busy" and stops. It never kills a process it did not start. Another window holds 5184 and another 5185: never touch them, and never touch 5173.
- Run `npx prettier --write` on the files you created or edited. Do not run `npm run format`; only the last task runs it.
- Order: Task 1; pure modules and their properties; mutants; schema and look data; the art (hall layers, props, ghost, wear, bokeh and halation, title card, tints, dawn, Lights On); the browser suites; the capture tool; the review rounds; docs and the log. Shared files (`src/fx/look/schema.ts`, `src/fx/controller.ts`, `src/fx/index.ts`, `docs/KIRO_LOG.md`) are edited in one task each where possible; later tasks that touch them name the earlier one.
- The final task runs `npm run format`, `npm run check` (green, and green again with `FC_SEED=1` and `FC_SEED=2`), `npm run build`, and the whole e2e suite when no other browser task is running.

## 20. Definition of done

- Every task done; `npm run check`, `npm run build` and the e2e suite green; the old fx e2e specs still pass.
- L1 to L8 and V1 to V8 pass; at least 8 mutants fail their check.
- `docs/evidence/film/REVIEW.md`, the contact sheet and the before-and-after picture exist, and every picture was opened.
- `docs/architecture/film.md` (the layers and their order, the tokens, how to add a chapter tint, the API: `playTitleCard`, `setLook`, `lookBlend`) and a dated entry in `docs/KIRO_LOG.md`.
- Final reply in five lines: what exists; the test counts; what the pictures honestly show, including what is still weak and what needs the owner's eyes; anything the brief got wrong; the credit cost if Kiro shows it.
