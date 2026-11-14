# Brief: game-shell (spec 8a of 9: the shell skeleton)

Owner decisions, written Nov 14 2026. Spec name: `game-shell`. Branch: `feat/shell`.
This brief answers every clarifying question. If something is missing, choose the simplest option and record it in design.md under "Decisions". If the spec documents ever disagree with this brief, follow the brief and note the difference in design.md.

## 1. Goal

Build the game's own screens: the **shell**. It is everything except the haunted level pages: the title screen, a persistent Menu, chapter select, settings (with **Assist mode**), a live-region **announcer** that turns engine events into sentences, saved settings and progress on the device, and the place where a level page will be hosted. The shell must be fully operable and accessible by design, because the haunted pages inside it are broken on purpose. It must also look intentional: dark, warm and quiet, not a default page. The rack-focus light (built in another window) is added later through a small port, so nothing here waits for it.

## 2. Not in this spec

The light and camera effect (spec `rack-focus-fx`, another window), sound (audio engine), the Prologue scene and every real level, ghost silhouettes, title cards, Grimoire and Codex screens, Ghost Hunt, the Ward. Do not edit `src/engine` (read-only: import only from `src/engine/index.ts`), `src/fx`, `looks/`, `labs/`, `levels/`.

## 3. Files you own

`src/ui/**`, `src/app.tsx`, `src/main.tsx`, `src/styles.css`, `index.html` (root), `tests/unit/ui/**`, `tests/property/ui/**`, `tests/e2e/shell/**`, `tests/fixtures/pages/**`, `docs/architecture/shell.md`, `docs/evidence/shell/**`, and `.local/e2e-port` (see section 12). The focus-guard hook blocks `outline: none` and `outline: 0` under `src/`: never work around it.

## 4. Decisions already made

1. Preact (already installed) and plain CSS. **No new dependency.** No router library, no state library.
2. **Hash routes** (`#/...`), because GitHub Pages has no server routes. Base path `/keyboard-ghosts/`.
3. UI logic lives in **pure modules** tested in Node (router, store, settings, save file, announcer queue, event text, strings). Components are thin and are tested in a real browser with Playwright. No DOM emulation (docs/decisions.md, D3). No test asserts elapsed time (D4): use injected schedulers or wait for conditions.
4. Data has zod schemas (D2). Types come from the schemas.
5. Everything the player reads is in `src/ui/strings.ts`, in the voice of `.kiro/steering/story-bible.md`: sentences of at most 14 words, present tense, US spelling, "people who use a keyboard", none of the words the bible forbids, no claim that the game or a page is "fully accessible" or "WCAG compliant". Buttons and links start with a verb where natural ("Start the story", "Choose a chapter"); the persistent button is named exactly "Menu".
6. **Nothing leaves the device.** No analytics, no web fonts, no outside request.
7. The shell never simulates key presses. It never moves focus except on a route change (section 6).
8. Levels are standalone pages in a same-origin iframe (D1). The shell hosts them but never injects HTML.

## 5. Routes (pure module `src/ui/router.ts`)

| Hash | Screen | h1 |
|---|---|---|
| `#/` | Title | "Keyboard Ghosts" |
| `#/chapters` | Chapter select (seven chapters from `CHAPTER_IDS` in the engine: porch, foyer, chapel, gallery, library, attic, finale) | "Choose a chapter" |
| `#/settings` | Settings | "Settings" |
| `#/play/<chapter>` | A chapter. In this spec every chapter shows the panel "This room is not ready yet." with a link back to the chapters | the chapter's card title |
| `#/play/dev-trap` | **Dev only** (`import.meta.env.DEV`): hosts `tests/fixtures/pages/trap.html` in the level host, to prove the Menu stays reachable | "Dev: keyboard trap" |
| anything else | Not found, with links home and to the chapters | "Page not found" |

`parseRoute(hash)` and `formatRoute(route)` are total: they never throw, for any string. The chapter list data (`src/ui/chapters.ts`) holds, for each chapter: id, card title ("The Porch", "I. The Foyer", "II. The Chapel", "III. The Gallery", "IV. The Library", "V. The Attic", "The Door"), verb ("Tab", "See and name", "Escape", "Time and motion", "Read and write", "Order and meaning", "Ward the house"), the intro line from the story bible (section 2 of it) and `available: false` for all (a later spec flips them).

## 6. Landmarks, focus and live regions (the accessibility design)

- Every screen has: `header` (banner) holding the skip link and `nav aria-label="Game menu"` with the persistent **Menu** button; `main` (`id="main"`, `tabindex="-1"`); `footer` (contentinfo). Exactly one `h1` per screen.
- The skip link is the first focusable element on every screen and moves focus to `main`.
- **On every route change**, focus moves to that screen's `h1` (`tabindex="-1"`), `document.title` becomes "<h1> | Keyboard Ghosts", and the announcer says the h1. Not on the first load.
- **Menu** is a disclosure (a button with `aria-expanded` and `aria-controls`, and a list of links and switches), not a modal dialog. Items: Home, Choose a chapter, Settings, and two switches: Assist mode and Lights On. **Escape** closes it and puts focus back on the Menu button. Focus leaving the open Menu closes it. There is no focus trap anywhere in the shell.
- **Shortcut**, never required: `Alt+M` opens the Menu from anywhere, and `?` does too unless focus is in a text field, select or contenteditable. The shell also listens for these keys inside a same-origin level frame, so the Menu stays reachable when the page trap-locks focus. The Menu is always reachable by landmark navigation too.
- The **announcer** is two visually hidden polite live regions used alternately, so repeating the same sentence is still announced. Pure queue model in `src/ui/announcer.ts`: never drops a message, keeps order, never merges two messages. A setting change announces itself ("Assist mode is on.").
- Visible focus on everything: `:focus-visible` with a 3 px solid ring in the palette's light colour and 2 px offset. Real buttons, links, labels and fieldsets; no clickable divs.
- Respect `prefers-reduced-motion` (see settings). Sound is off by default (stored only; no audio in this spec).

## 7. Settings, Assist mode, saving (pure modules `settings.ts`, `save.ts`, `store.ts`)

Settings (zod): `assist` (default false), `lightsOn` (false), `reducedMotion` (`"system" | "on" | "off"`, default `"system"`), `captions` (true), `sound` (false). `effectiveReducedMotion(setting, systemPrefers)` is a pure function.
- **Assist mode** means: the pointer works inside the level frame, hints are on (a flag for later screens), and results will be labelled "assisted". In default mode the level frame gets `pointer-events: none` ("the mouse has been taken away"; the page says so in one short line). Assist is also offered once, on first visit, on the title screen in a region "Before you start" with two buttons ("Play with the keyboard only" and "Turn on Assist mode"); the choice is stored and the region never returns.
- **Lights On** sets `data-lights="on"` on the root element: a designed daylight look (palette in section 9), not a fallback.
- **Saving** (`src/ui/save.ts`): one key `keyboard-ghosts:v1` in `localStorage`, holding `{ version: 1, settings, firstRunDone, progress }` where `progress` maps a level id to saved engine state (kept as `unknown` and checked with the engine's `restoreGame` when a level loads). Storage is injected as `{ getItem, setItem }` so the module is pure and testable. Reading never throws: missing, corrupt, wrong-version or hostile data gives the defaults and a polite announcement ("Saved settings could not be read. Defaults are on."). Unknown keys are dropped. Writing failures (quota, private mode) never break the game.
- Settings screen: real switches (checkboxes with labels and one-line descriptions) and a three-way choice for reduced motion; every change applies at once, is saved and announced.

## 8. The level host and the fx port (components in `src/ui/`)

- `LevelHost`: a same-origin `iframe` with a `title` (the level's title), filling the main area. Props: `src`, `title`, `assist`. It forwards the shortcut keys (section 6). In this spec only the dev trap page uses it.
- `FxPort` (`src/ui/fx-port.ts`): the contract the shell uses to talk to the light effect, so the effect can be added later without changing screens: `mount(host: HTMLElement, frame?: HTMLIFrameElement): void`, `unmount(): void`, `setRingOverride(value: boolean | null): void`, `setLightsOn(on: boolean): void`, `setReducedMotion(on: boolean): void`, `state(): { tier: 0 | 1 | 2; drifting: boolean }`. Ship `nullFx` (does nothing, tier 0) and use it everywhere. The settings feed `setLightsOn` and `setReducedMotion`.
- `describeEvent(event, level)` (`src/ui/announce.ts`, pure): turns every engine event into one announcement. `ghost-met`: "<ghost name>. <its line>" (the ghost's own words). `repair-chosen`: correct: "You chose: <label>."; decoy: the decoy's `why`. `focus-restored`: "The light returns." `ghost-released`: the ghost's `releaseLine`. `level-solved`: "Every ghost is at rest." `undone`: "Undone." `level-reset`: "The room starts again." `nothing-to-undo`: "Nothing to undo." `rejected`: by reason ("That ghost is not here.", "That repair is not here.", "That ghost is already at rest."). An exhaustive switch over `EVENT_KINDS`: adding an event kind without a message must not compile.

## 9. Look of the shell (static, no effects)

Dark base (the Foyer palette from the look bible): ink `#0d0a08`, light `#f6b95c` (focus ring, key accents), text `#f4e6cf`, accent `#8a5a2b` (borders and rules only, never text or focus). Lights On: cream `#fbf3e1`, text `#2a2118`, ring `#2a2118`, accent `#8a5a2b`. Contrast of text on its surface at least 4.5 to 1 in both. Titles in the Georgia serif stack, controls and body in system UI, body 18 px, line height 1.5, text columns at most 62 characters wide, generous spacing (8 px grid), buttons with a visible border and at least 44 px height. A quiet title screen: the title, one short line ("A haunted website, lit only by your keyboard focus."), the buttons, and a subtle static candle-glow background made with CSS gradients only (no images, no animation; under `prefers-reduced-motion` nothing moves anyway). Chapter select: seven cards in reading order, each with its card title, verb and intro line; unavailable chapters say "Not ready yet" in text, not only by colour. It must look designed at first glance, at 1280x720 and at 360x640, and work at 400% zoom without horizontal scrolling of the main content.

## 10. Properties (fast-check, at least 200 runs, Node; `tests/property/ui/`, shared settings in `tests/property/fc-config.ts`)

- S1 Router is total: for any string, `parseRoute` does not throw and returns a known route; for every known route, `parseRoute(formatRoute(r))` equals `r`.
- S2 Save file is safe: for any JSON value or any string, `loadSave` returns valid settings and never throws; a valid save round-trips unchanged; unknown keys are dropped; a wrong version gives the defaults.
- S3 Settings: `effectiveReducedMotion` is total and follows its table (`system` follows the system; `on` and `off` win); toggling a switch twice returns the original settings.
- S4 Announcer queue: for any list of messages, the output has the same messages in the same order, alternating between the two regions, none merged or dropped.
- S5 Event text: for events produced by random games on random valid levels (reuse `tests/property/arbitraries.ts` from the engine spec), `describeEvent` always returns a non-empty sentence of at most 20 words, never contains "undefined" or "[object", and uses the decoy's `why` word for word for a decoy.
- S6 Strings: every string in `strings.ts` has sentences of at most 14 words, contains none of the forbidden words, and makes no "fully accessible" or "WCAG compliant" claim.
- S7 Chapter data: seven chapters, ids equal the engine's `CHAPTER_IDS`, every route for them parses, every intro line is at most 14 words.

## 11. Tests that prove the tests

At least 6 deliberate mutants for the pure modules (for example: a router that throws on `#/play/`, a save loader that trusts the version, an announcer that drops a duplicate, an `effectiveReducedMotion` that ignores `off`, a `describeEvent` that returns an empty string for `level-reset`, a toggle that is not its own inverse), each shown to fail the matching property, in `tests/property/ui/mutants.test.ts`.

## 12. End-to-end tests (Playwright in Chrome, semantic only, in `tests/e2e/shell/`)

**Port: this worktree uses 5184**, not 5183 (another window uses 5183). Create `.local/e2e-port` containing `5184` (the folder is git-ignored; the Playwright config already reads it). Never use 5173 or 5183. Every browser task is in one lane: two of them never run together, each stops every server and browser it starts (even on failure), and if port 5184 is busy it waits up to 60 seconds and then reports "port busy" without killing anything.
- Every screen (title, chapters, settings, a chapter, not found; default, Lights On, reduced motion forced on): landmarks (banner, `nav` named "Game menu", main, contentinfo), exactly one h1, skip link first and working, **axe with 0 violations**.
- Route change moves focus to the h1, updates the title, and the announcer text changes.
- The Menu: first control after the skip link; opens and closes with the keyboard; Escape returns focus to the button; items work; Assist and Lights On switches work.
- Settings and the first-run choice persist across a reload; corrupted storage does not break the page and announces the fallback.
- The trap fixture (`tests/fixtures/pages/trap.html`: a page that keeps Tab inside a small group of controls): inside the level host, `Alt+M` and `?` move focus to the Menu; default mode gives the frame `pointer-events: none`, Assist mode removes it.
- 200% and 400% zoom (emulated): no horizontal scroll of the main content; the Menu stays reachable.
- No request to another origin; no console errors or warnings.
- The production build has no `dev-trap` route and no trace of the trap fixture.
- Screenshots of every screen (dark and Lights On, 1280x720 and 360x640) go to `docs/evidence/shell/` (a human reviews them; no assertion).

## 13. Visual review (the last tasks, at most 2 rounds)

View the screenshots and check each line: 1. It looks designed, not default (spacing, type, a calm hierarchy). 2. The focus ring is clearly visible on every control, dark and Lights On. 3. Nothing is clipped, overlapped or cramped at 360x640. 4. Unavailable chapters read as unavailable without colour. 5. Lights On looks like a finished daylight page. Fix what fails, capture again, and write each round in `docs/evidence/shell/REVIEW.md` (what changed, what is still weak). If you cannot open images, say so plainly and stop this task.

## 14. Rules for tasks.md

- No task is optional: no `*` markers, including every property test, mutant and e2e test.
- **Every task has an "After: <task numbers>" line** and a "Files:" line. Two tasks run together only when neither names the other and they share no file. Where tasks in different groups edit the same file, the later one names the earlier one.
- **Browser lane:** tasks that start the dev server, Playwright or a browser never run together (section 12). Chain them with After lines.
- Run `npx prettier --write` on the files you created or edited. Do not run `npm run format` (it rewrites files other tasks are editing); only the final task runs it.
- Order: pure modules and their properties, then mutants, then components, then the shell wiring, then e2e, then the visual review, then docs and the log. Shared files (`src/app.tsx`, `src/styles.css`, `index.html`) are edited only in the wiring tasks.
- The final task runs `npm run format`, `npm run check` (green, and green again with `FC_SEED=1` and `FC_SEED=2`), `npm run build`, and the e2e suite when no other browser task is running.

## 15. Definition of done

- Every task done; `npm run check`, `npm run build` and the e2e suite green.
- Properties S1 to S7 and at least 6 mutants pass; axe reports 0 violations on every screen listed in section 12.
- `docs/architecture/shell.md` (diagram, routes table, landmark and focus rules, the announcer, the save format, the `FxPort` contract and how the effect plugs in) and a dated entry in `docs/KIRO_LOG.md` (counts and surprises).
- Final reply in five lines: what exists; the test counts; what the screenshots look like (honest, including what is still weak); anything the brief got wrong; the credit cost if Kiro shows it.
