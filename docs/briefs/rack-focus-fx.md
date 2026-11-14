# Brief: rack-focus-fx and the Foyer look lab (spec 2 of 9)

Owner decisions, written Nov 14 2026. Spec name: `rack-focus-fx`. Branch: `feat/fx`.
This brief answers every clarifying question. If something is missing, choose the simplest option and record it in design.md under "Decisions". If the spec documents ever disagree with this brief, follow the brief and note the difference in design.md.

## 1. Goal

Build the production light-and-camera system of Keyboard Ghosts and the first picture worth showing: one candle-lit haunted page where the focused element is lit and sharp and the world falls away. The result must look art-directed at first glance, move like a camera pulling focus, stay fast, and be proven by tests. This is the "wow" test of the project: judge it by screenshots, not by test counts.

## 2. Not in this spec

Ghost silhouettes, shadows, title cards, sound, the shell, the engine, the real level pages in `levels/`. Do not import from `src/engine`. Other looks (chapel, gallery, library, attic, finale) only need valid starting data, not tuning.

## 3. Files you own

`src/fx/**`, `looks/**`, `labs/**`, `tools/bench/**`, `tests/unit/fx/**`, `tests/property/fx/**`, `tests/e2e/fx/**`, `docs/architecture/fx.md` (the integrator links it), `docs/evidence/look/**`, `tsconfig.json` (add `labs` and `tools` to include), `eslint.config.js` (fx rules only).
Do not touch `src/engine`, `src/ui`, `src/audio`, `src/app.tsx`, `src/main.tsx`, `src/styles.css`, `.kiro/hooks`, `docs/architecture.md`. Keep `spikes/` as evidence (read-only).
Use port 5183 for the dev server and Playwright. Never use 5173. Stop every process you start.

## 4. Read first

`.kiro/steering/look-bible.md`, `spikes/rack-focus/RESULTS.md` (round 2 and its list of unproven things), `spikes/rack-focus/rack-focus.ts`, `docs/decisions.md` (D1 to D4). The spike is a prototype: port its ideas, do not copy it, and fix what its results list as weak.

## 5. Decisions already made

1. **Focus source.** The lit element is the deepest active element: follow `document.activeElement` into same-origin iframes and open shadow roots. Report its rectangle in the top document's viewport CSS pixels (add the frame's offset). Levels will live in same-origin iframes (D1), so the lab hosts its page in one.
2. **Ring detection.** A documented heuristic from computed style (outline style, width and colour alpha, plus a focus-only box-shadow when it can be told). State its limits in design.md. Expose an override so the game can say "the ring is missing" from its own data.
3. **Injected clock.** All time goes through a `Clock` (now, requestFrame, cancel, `timeScale`). A manual clock exists for tests and screenshots. `slowmo(ms, speed)` slows `timeScale` for the repair beat.
4. **Overlay.** Port the spike's round-2 structure: 2 backdrop-blur layers and 1 darkness layer, each masked by static gradients positioned by 4 CSS variables, written only when the lit core moved. Idle means zero writes to those variables. The overlay is `aria-hidden`, `pointer-events: none` and never focusable.
5. **Numbers come from look data, not code.** The starting values are in section 6 (they replace the darkness numbers in the look bible).
6. **Tiers.** 2 (full), 1 (light and darkness only, no blur, no atmosphere), 0 (nothing). `?tier=` forces one and skips the probe. Otherwise a start-up probe runs the real effect for 1.5 s (six jumps, one per 200 ms) and drops one tier if the median frame is over 20 ms or the 95th percentile is over 40 ms. A watchdog drops one tier, once, after 30 consecutive frames over 50 ms. Reduced motion, forced colors, Lights On and any internal error mean tier 0. Never log errors or warnings to the console in normal operation.
7. **Atmosphere (tier 2 only).** Vignette, film grain, dust motes, candle flicker and a warm bloom at the lit core. Cheap techniques only: grain is one small pre-made noise tile stepped with CSS at 12 steps a second (no per-frame JavaScript); dust is one small 2D canvas, at most 60 particles, at most 30 frames a second; flicker updates at most 12 times a second. Everything pauses when the document is hidden.
8. **Camera.** On keyboard focus (not mouse), glide the focused element toward the vertical centre in 260 ms with a hand-driven scroll, unless it is already in the middle third, reduced motion is on, or the user wheels or touches. It also works inside an iframe.

## 6. Look data (`looks/<id>.json`, zod schema in `src/fx/look/`)

Files: `foyer` (used by the Porch and the Foyer), `chapel`, `gallery`, `library`, `attic`, `finale` and `lights-on`. Fields: id, name, palette (`ink`, `light`, `accent`, `text`, optional `panel`), light, flicker, grade, motes, soundSet (a name only), plus `tunables` metadata (min, max, step) for every number a person may tune.

| id | ink | light | accent | text |
|---|---|---|---|---|
| foyer | #0d0a08 | #f6b95c | #8a5a2b | #f4e6cf |
| chapel | #0b0f1c | #9fb8e8 | #7a5cc4 | #e6ecfa |
| gallery | #100a0a | #fff3dc | #8c1f2a | #fff6e6 |
| library | #0a120e | #7fd0a8 | #c49a4a | #eaf3e3 |
| attic | #0c0e11 | #dfe8f5 | #ffcf7a | #f0f3f6 |
| finale | #1b2733 | #f5c96a | #9ec9f0 | #2a2118 on light panels (define `panel`) |
| lights-on | cream #fbf3e1 | ink text #2a2118 | each chapter's accent | no blur, no darkness |

Starting numbers (tier 2): lit core = focused element plus 20 px; corner = the element's corner plus 12 px; darkness 0 at the core edge, 55% by 20 px and 78% by 120 px; blur 0 to 12 px over 120 px; glide 260 ms ease-out with 6% overshoot; drift (no ring) 900 ms to 90% dark and 14 px blur; snap-back 320 ms with a 40 ms warm bloom and then a slow-motion beat of 600 ms at 35% speed; flicker at most 6% and at most 2.5 times a second; grain 5% at 12 steps a second; vignette 35%; dust 24 motes near the light and a burst of 60 on release. Rules the data must keep: `text` against the surface it is used on at least 4.5 to 1; `light` against `ink` at least 3 to 1; `accent` is never used for text or focus. If a starting palette breaks a rule, adjust it minimally and log it.

## 7. Properties (all required, fast-check, at least 200 runs; pure code, runs in Node)

- F1 Containment: for any rectangle, corner and look, the lit core contains the rectangle grown by the ring width plus 2 px, and its edges are whole CSS pixels.
- F2 Soft falloff: darkness and blur are 0 at the core edge, non-decreasing with distance, bounded by the look, and no 1 px step changes darkness by more than 0.05 (no visible edge).
- F3 Motion curves: glide starts at 0 and ends at 1, overshoots by at most the look's overshoot, never goes below 0; drift and snap-back stay between their endpoints.
- F4 Flicker: never differs from 1 by more than the look's limit; changes direction at most twice the look's maximum rate per second.
- F5 Contrast: the ratio is symmetric, at least 1, 21 for black on white; a palette passes if and only if its ratio is at least the required one; every shipped look passes.
- F6 Tier policy: worse frame statistics never give a higher tier; a forced tier wins; reduced motion, forced colors and Lights On give 0.
- F7 Look files: every file parses, ids are unique, every number is inside its tunable range, all seven ids exist.
- F8 Camera target: the target scroll is inside [0, max]; nothing moves when the element is in the middle third; otherwise the element ends in the middle third unless the scroll limit stops it.
- F9 Bloom limit: however often the ring is restored, at most 2 blooms a second are produced (no flash above 3 a second).

## 8. The Foyer look lab

`labs/foyer/index.html` is the lab shell (a skip link, a header with a real "Menu" button, a same-origin iframe titled "Haunted page: the Foyer", a footer link, the fx, and the tuning panel in dev only). `labs/foyer/page.html` is the haunted page: a standalone page that is the first draft of `levels/foyer`. It is not under `src/`, so it may contain barriers on purpose.

URL parameters: `?look=<id>` (re-skins the same page, a quick way to preview palettes), `?tier=0|1|2`, `?lights=on`, `?fixed=1` (on the page: both barriers repaired), `?tune=1` (dev only), `?test=1` (manual clock and `window.__fx` with `step(ms)`, `state()`, `writes()`; absent from production builds).

Controls in the lab shell: "Break the ring" and "Restore the ring" (they toggle a barrier style inside the page; that style lives in `labs/foyer/page.css`, never under `src/`).

**Art direction. Code-made only (CSS, inline SVG, canvas); no image files, no downloaded fonts.**
- The site is a fictional guesthouse called "The House". Nav: Rooms, Guestbook, Cellar, Contact. Hero: the heading "The hall is warm." and one short line. Six portrait-frame cards that are links (frames with bevels from box-shadow; paintings are abstract silhouettes, no faces). A guestbook form (name field with a label, message with a label, a "Sign the book" button). A footer with three links. An icon-only candle button in the hero. At least 14 focus stops.
- The room: a dark damask-style wallpaper tile (low contrast), wainscot panels from gradients and inset shadows, a floor strip with perspective lines, a tall arched doorway with a warm glow behind it, a grandfather-clock silhouette whose pendulum swings (still under reduced motion), a console table with a candle (decoration; the lamp is the focus light). Titles in a Georgia serif stack, controls in system UI, brass-coloured nav links ("doors").
- Two deliberate barriers. **Invisible:** the nav links, cards and form controls have no visible focus indicator. **Faceless:** the candle button has no accessible name. With `?fixed=1` both are repaired and axe reports 0 violations. Record what axe reports on the haunted page and on the fixed page in `docs/evidence/look/lab-axe.json`, and say honestly which ghost axe cannot see.
- Contrast: the base page keeps text at 4.5 to 1 or better. Lights On is a designed daylight version, not a fallback.

## 9. Tuning panel (dev only)

A collapsible side drawer, closed by default, opened by `?tune=1`. One slider per tunable (min, max, step and unit from the schema), live updates, a "Copy look JSON" button, values kept in sessionStorage. Test: a production build contains no trace of it.

## 10. Tests

- Unit and property (Node): section 7, plus the tunables, the ring-detection helpers that need no layout, and the clock.
- E2E (Playwright, Chrome), semantic only: containment of the settled lit core around every focus stop (at least 12) in the shell and inside the iframe; after scroll, window resize, and emulated 200% and 400% zoom; idle means zero writes; drift and snap-back states using the manual clock; tiers (forced, reduced motion, forced colors, Lights On, a forced probe failure); the overlay never blocks a click and is not in the tab order; the camera on keyboard focus, not on mouse focus; no requests to another origin; no console errors or warnings; axe on the lab shell and on `?fixed=1` (0 violations); the production build has no tuning panel and no `window.__fx`.
- **No test that gates a merge may assert elapsed time or frame time.** Wait for conditions or step the manual clock. Frame-time tables belong to `tools/bench/` and only print (normal, `--disable-gpu`, CPU x4, five runs each, every run shown).
- Move the spike's tests that are about timing into `tools/bench`. Replace the rest with `tests/e2e/fx/`; keep the spike folder.
- The ring-detection check on screenshots is a human review, not an assertion.

## 11. Visual review loop (the last tasks; at most 3 rounds)

Capture these states at 1280x720 with the manual clock, into `docs/evidence/look/`: `01-idle`, `02-focus-link`, `03-focus-card`, `04-focus-input`, `05-drift`, `06-snapback`, `07-tier1`, `08-tier0`, `09-lights-on`, and one at 1920x1080. View them and check each line:
1. The focused item is the brightest and sharpest thing, with its ring clearly visible.
2. No visible rectangle, seam or banding in the falloff; it looks like soft light, not a box.
3. Neighbours within about one row are readable; far items sink into the dark.
4. Bloom and vignette add depth without washing text out; grain is felt, not seen; dust is visible near the light and never distracting.
5. Drift feels like the picture losing focus: dark, soft, a little unsettling, with a faint hint of structure, not a black screen.
6. Snap-back feels like a pulled focus: quick, warm, no flash.
7. At first glance the page looks designed, not default.
8. Tier 1 looks intentional; tier 0 is a clean plain page.
Fix what fails, then capture again. Write each round into `docs/evidence/look/REVIEW.md` (what you changed, what is still weak). If you cannot open images, say so plainly and stop this task.

## 12. Rules for tasks.md

- No task is optional. Do not use the optional marker (`*`).
- Each task lists the files it creates or edits. Two tasks that can run at the same time must not edit the same file.
- Order: pure modules and their properties, then DOM modules, then the lab, then atmosphere, then the tuning panel, then e2e, then bench, then the visual review loop, then docs and the log. Barrels and shared config edits come last.
- The focus-guard hook blocks `outline: none` and `outline: 0` under `src/`. Never work around it. If it blocks you, say so in the report.

## 13. Definition of done

- Every task done; `npm run check` green; `npm run e2e` green when nothing else is running; `npm run build` green.
- 9 properties, the e2e list above and the screenshots exist.
- `docs/architecture/fx.md` (diagram, API, tier policy, limits of ring detection) and the dated entry in `docs/KIRO_LOG.md` (counts and surprises).
- Final reply in five lines: what exists; the test counts; what the screenshots look like (honest, including what is still weak); anything the brief got wrong; the credit cost if Kiro shows it.
