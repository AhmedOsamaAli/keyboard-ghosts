# Requirements: level-engine

Source: [docs/briefs/level-engine.md](../../../docs/briefs/level-engine.md), including section 12 (Amendments). The brief wins over this file. "Brief §n" points to the section of the brief.

Terms: the **engine** is the code in `src/engine/`. A **level** is data that passes `parseLevel`. A **state** is a `GameState`.

## Scope and rules for the code

**R1 (Brief §4.1).** The engine shall be written in TypeScript strict mode, without `any` and without default exports, and shall export its public API only from `src/engine/index.ts`.

**R2 (Brief §4.2).** The engine shall define every schema with zod 4 and shall derive every data type with `z.infer`.

**R3 (Brief §4.3).** The engine shall never touch a page. The page shall be a pure function of the base level page and `activePatches(level, state)`, so that undo and reset need no special cases.

**R4 (Brief §4.4).** The tests shall run in Node with Vitest and fast-check and shall not use DOM emulation.

**R5 (Brief §4.5).** All words written by this spec (fixtures, error messages, docs) shall follow `.kiro/steering/story-bible.md`: at most 14 words per sentence, present tense, no real brands.

**R6 (Brief §4.6).** The engine shall receive time, randomness and the outside world as inputs and shall never read them inside the engine.

**R7 (Brief §2, §3).** The spec shall not add DOM, CSS, rendering, sound, story text, shell, real level pages, Ghost Hunt generation or the Ward. The work shall touch only the files the brief lists in §3, which include `tests/property/fc-config.ts`. No task shall start a dev server or run Playwright.

**R8 (Brief §3).** `src/engine/clamp.ts` and its tests shall keep working.

## Data contract (Brief §5, §6)

**R9 (Brief §5, data types).** The engine shall export schemas and types for `ChapterId`, `BarrierKind`, `LayerId`, `Wcag`, `RepairPatch` (discriminated on `op`: `css`, `attr`, `text`, `behavior`), `Repair`, `Ghost` and `Level`, with the names and fields fixed by the brief.

**R10 (Brief §5, Repair).** The data contract shall require a `Repair` label to start with a verb and to have at most 60 characters, at least one patch, and exactly the `why` rule: a decoy (`correct` false) has a `why` of one sentence with at most 20 words, and the correct repair has no `why`.

**R11 (Brief §5, Ghost and Level).** The data contract shall require: ghost `id` and level `id` in kebab-case; ghost ids unique in the level; `line` and `releaseLine` at most 14 words; `lesson` at most 40 words; a non-empty `selector`; at least one `wcag` entry; at least one `seenBy` flag true; 2 to 4 repairs with exactly one correct; 1 to 8 ghosts; an `exit.selector`.

**R12 (Brief §5, parseLevel).** When `parseLevel(input: unknown)` receives valid data, the engine shall return `{ ok: true, level }`. When it receives invalid data, the engine shall return `{ ok: false, errors }` where every error is `{ code, path, message }` and the list holds every error, not only the first.

**R13 (Brief §5, error codes).** The engine shall report exactly these 15 error codes: `level-id-invalid`, `ghost-count`, `ghost-id-duplicate`, `repair-count`, `no-correct-repair`, `multiple-correct-repairs`, `decoy-without-reason`, `correct-with-reason`, `line-too-long`, `wcag-unknown`, `selector-empty`, `layers-none`, `exit-selector-missing`, `patch-invalid`, and `schema-invalid` (input whose shape cannot be read and that no other code explains).

**R14 (Brief §6).** `src/engine/wcag.ts` shall export the 14-row WCAG 2.2 table of the brief as data (sc, name, level, slug) and `understandingUrl(sc)` returning `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`.

## Engine API (Brief §7)

**R15 (Brief §7, createEngine and validate).** The engine shall export `createEngine(overrides?)`, which builds the engine from small rule functions: `validate`, `pick`, `release`, `snapshot`, `restore`, `ambient` and `canonical` (and the three extra rules in design.md Decisions 24). `validate` decides which actions are allowed, and `step` shall ask it before anything else. Only tests shall pass `overrides`.

**R16 (Brief §7, state).** `createGame(level, seed)` shall return a `GameState` that holds, per ghost, `status` (`haunting` or `released`), `picked` (a repair id or null) and `attempts`, plus an undo history limited to 100 entries, a step counter and the seed. `GameState` shall be plain data: it shall survive `JSON.parse(JSON.stringify(state))` unchanged, with no Map, Set, class, function or undefined.

**R17 (Brief §7, step and meet).** `step(level, state, action)` shall return `{ state, events }` and shall accept the actions `meet(ghost)`, `repair(ghost, repair)`, `undo` and `reset` (ghost and repair are ids). `meet` shall change nothing: it shall return the same state object, add no history and not move the step counter. The step counter shall count accepted `repair`, `undo` and `reset` actions only.

**R18 (Brief §7, rules and reset).** While a ghost has a picked repair, when another repair is picked, the engine shall replace the pick and count an attempt. When a correct repair is picked, the engine shall release the ghost. When a decoy is picked, the engine shall leave the ghost haunting and emit the decoy's `why`. While a ghost is released, the engine shall reject any change to it, except through `undo` or `reset`. When `reset` runs, the engine shall put every ghost back to haunting with nothing picked and 0 attempts, and shall push one history entry, so that `undo` brings the old state back.

**R19 (Brief §7, events).** The engine shall export `EVENT_KINDS` with exactly these 9 kinds: `ghost-met`, `repair-chosen`, `focus-restored`, `ghost-released`, `level-solved`, `undone`, `level-reset`, `nothing-to-undo`, `rejected`. A `rejected` event shall carry a reason: `unknown-ghost`, `unknown-repair` or `already-released`. When `reset` runs, the engine shall emit `level-reset` and never `undone`.

**R20 (Brief §7, event order).** When a correct repair is picked, the engine shall emit `repair-chosen`, then `focus-restored`, then `ghost-released`, then `level-solved` if it was the last ghost.

**R21 (Brief §7, selectors).** The engine shall export the selectors `isSolved`, `remaining`, `progress`, `activePatches(level, state)` and `canonical(state)` (a stable string that ignores history, attempts and the step counter). `activePatches` shall return the patches of every ghost's picked repair, correct or not, in ghost order and then patch order.

**R22 (Brief §7, ambient).** `ambient(level, state)` shall return a number from `AMBIENT_MIN` (0.15) up to 1: `AMBIENT_MIN` when nothing is released, 1 when everything is, and never lower as ghosts are released.

**R23 (Brief §7, rng).** `src/engine/rng.ts` shall export a seeded generator with serialisable state and the methods `next()`, `int(min, max)`, `pick`, `shuffle` and `fork(label)`, with no global state and no `Math.random`.

**R24 (Brief §7, invariants).** `checkInvariants(level, state)` shall return a list of violations, and the list shall be empty when the state is sound.

**R47 (Brief §7, restoreGame).** `restoreGame(level, saved: unknown)` shall return a valid `GameState` or `null`. It shall check the shape of `saved` and run `checkInvariants`, and shall return `null` when either fails.

**R48 (Brief §7, event payloads).** Every event shall carry the ids it is about, so the shell needs no lookup. `repair-chosen` shall also carry `correct` and, for a decoy, its `why`. `ghost-released` shall carry the ghost's `releaseLine`. `rejected` shall carry its reason.

**R49 (Brief §5, shape problems and rule checks).** When the shape check finds a problem, `parseLevel` shall translate it to a named code by its path: a missing or empty ghost `selector` is `selector-empty`, a missing or empty `exit.selector` is `exit-selector-missing`, anything wrong inside a patch is `patch-invalid`, an unknown WCAG number is `wcag-unknown`, and any other problem is `schema-invalid`. `parseLevel` shall run the rule checks on everything it could read, even when the shape check found problems, so that a level with several faults reports all of them.

## Properties (Brief §8)

Each property is a fast-check test with at least 200 runs. design.md states each one word for word.

**R25 (P1 Idempotent).** When the same repair is chosen for a ghost twice, the canonical state shall equal the state after choosing it once.

**R26 (P2 Commutes across ghosts).** When actions target different ghosts, reordering them shall not change the final canonical state.

**R27 (P3 Every ghost is necessary).** When any one ghost's correct repair is left out of a valid level, the level shall stay unsolved.

**R28 (P4 Sufficient).** When every ghost's correct repair is applied, in any order and with decoys tried first, the level shall be solved.

**R29 (P5 Undo restores).** After any state-changing action (`repair` or `reset`), `undo` shall return exactly the previous canonical state. With empty history, `undo` shall change nothing and emit `nothing-to-undo`.

**R30 (P6 Ambient is bounded and monotone).** `ambient` shall always be within [`AMBIENT_MIN`, 1], shall equal `AMBIENT_MIN` when nothing is released and 1 when everything is, and shall never be lower after one more ghost is released (without undo).

**R31 (P7 Seeded randomness).** The same seed shall give the same sequence; forks with different labels shall be independent; `shuffle` shall return a permutation; `pick` shall return a member.

**R32 (P8 Fuzz).** For any sequence of valid and invalid actions, the engine shall never throw and `checkInvariants` shall stay empty. An invalid action shall change nothing and emit `rejected`. The test shall deep-freeze every level and state it passes in, check that `step` with the same inputs gives deep-equal results, and check that every state survives a JSON round trip and `restoreGame`.

**R33 (P9 Data).** Every generated valid level shall parse and round-trip through JSON. Breaking exactly one rule in a valid level shall fail with exactly the matching error code, and the test shall cover every one of the 15 codes.

**R34 (P10 Decoys never release).** Picking a decoy shall never release the ghost and shall always emit that decoy's `why` word for word, in the `repair-chosen` event.

**R46 (P11 Patches mirror the picks).** After any action, `activePatches` shall hold exactly the patches of every ghost's picked repair, decoys included, in ghost order then patch order. After `undo` it shall equal what it was before the undone action. After `reset` it shall be empty.

## Tests that prove the tests (Brief §9)

**R35 (Arbitraries).** `tests/property/arbitraries.ts` shall export a valid-level generator and an action-sequence generator.

**R36 (Mutants).** `tests/property/engine/mutants.test.ts` shall hold at least 10 deliberately broken engines built with `createEngine(overrides)`: a repair that is not idempotent, one that depends on order, undo that forgets a field, a reset that cannot be undone, a necessary ghost that does not count, an ambient that falls back to `AMBIENT_MIN` when the last ghost is released, a decoy that releases, a `validate` that lets an unknown id through and then crashes, a rule that changes the state it was given in place, and an `activePatches` that ignores decoy picks. For each mutant, the test shall assert that the matching property fails.

**R37 (Purity).** An ESLint rule set for `src/engine/**` shall forbid `window`, `document`, `localStorage`, `sessionStorage`, `fetch`, `performance`, `navigator`, timers, `requestAnimationFrame`, `Math.random`, `Date.now`, `new Date`, and imports from `src/fx`, `src/ui`, `src/audio`, `src/checks` and `src/hunt`. A unit test shall lint a deliberately bad snippet with ESLint's Node API and expect errors.

**R38 (Unit tests and fixtures).** Unit tests shall cover the WCAG table (14 rows, urls) and every `parseLevel` error code. `tests/fixtures/levels/` shall hold a valid 3-ghost level and a set of single-fault variants, one per error code.

## Tasks, housekeeping and done (Brief §10, §11)

**R39 (Brief §10, no optional task).** `tasks.md` shall have no optional task and no `*` marker, including every property test and every mutant. Each task shall list the files it creates or edits. Two tasks that can run together shall not edit the same file. The barrel `src/engine/index.ts`, the ESLint change and the docs shall be separate tasks near the end.

**R40 (Brief §10, H1).** Task H1 shall make `playwright.config.ts` read the port from `E2E_PORT`, then from the first line of `.local/e2e-port`, else 5183, and shall use the same port in the dev server command. H1 shall not run Playwright.

**R41 (Brief §10, final task).** The final task shall run `npm run format`, then `npm run check`, then `npm run check` twice more with `FC_SEED=1` and `FC_SEED=2` (fast-check shall read that variable), then append the log entry.

**R42 (Brief §11, checks).** When all tasks are done, `npm run check` (typecheck, lint, format:check, tests, asset check) shall be green, and green again with two other seeds, with all 11 properties, at least 10 mutants and the purity test passing.

**R43 (Brief §11, docs).** `docs/architecture/engine.md` shall hold a Mermaid diagram, the API table, and the properties with one line each on the bug it would catch. `src/engine/README.md` shall be updated.

**R44 (Brief §11, log).** `docs/KIRO_LOG.md` shall have a dated entry: what was built, counts (requirements, tasks, properties, mutants, tests) and surprises.

**R45 (Brief §11, final reply).** The final reply of the run shall have five lines: what exists; the test counts; anything the brief got wrong; anything assumed; the credit cost if Kiro shows it.
