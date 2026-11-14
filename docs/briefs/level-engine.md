# Brief: level-engine (spec 1 of 9)

Owner decisions, written Nov 14 2026. Spec name: `level-engine`. Branch: `feat/engine`.
This brief answers every clarifying question. If something is missing, choose the simplest option and record it in design.md under "Decisions". If the spec documents ever disagree with this brief, follow the brief and note the difference in design.md.

## 1. Goal

Build the pure rules of Keyboard Ghosts: the data contract for levels and ghosts, a validator for it, and a deterministic game engine. The look, sound, shell, Ghost Hunt and the Ward are built on top of it later, so it must be small, strict and proven by property tests.

## 2. Not in this spec

DOM, CSS, rendering, sound, story text, the shell, real level pages, Ghost Hunt generation, the Ward. Do not start a dev server and do not run Playwright (the other window uses port 5183).

## 3. Files you own

- `src/engine/**`, `tests/unit/engine/**`, `tests/property/engine/**`, `tests/property/arbitraries.ts`, `tests/property/fc-config.ts`, `tests/fixtures/levels/**`
- `docs/architecture/engine.md` (create it; the integrator links it from `docs/architecture.md`)
- `eslint.config.js` (engine rules only) and `playwright.config.ts` (task H1 only)
- Keep `src/engine/clamp.ts` and its tests working.
- Do not touch `src/fx`, `src/ui`, `src/audio`, `src/app.tsx`, `src/main.tsx`, `src/styles.css`, `looks/`, `labs/`, `.kiro/hooks`, `docs/architecture.md`.

## 4. Decisions already made

1. TypeScript strict, no `any`, no default exports. The public API is exported only from `src/engine/index.ts`.
2. zod 4 (already installed) defines every schema. Types come from `z.infer`.
3. The engine never touches a page. The page is a pure function of (the base level page, `activePatches(level, state)`). The shell resets the page and applies the patches, so undo and reset need no special cases. (Levels are standalone pages in an iframe: see `docs/decisions.md`, D1.)
4. Tests run in Node with Vitest and fast-check (installed). No DOM emulation.
5. All words follow `.kiro/steering/story-bible.md`: at most 14 words per sentence, present tense, no real brands.
6. Time, randomness and the outside world are inputs, never read inside the engine.

## 5. Data contract (names are fixed; you may add documented fields)

```
ChapterId   porch | foyer | chapel | gallery | library | attic | finale
BarrierKind focus-invisible | unnamed-control | no-skip-link | keyboard-trap | focus-lost-on-close |
            auto-moving-content | hover-only | drag-only | focus-obscured | low-contrast |
            unlabelled-field | silent-error | bad-focus-order | fake-button | several
LayerId     axe | level-check | walk

Wcag        { sc: "2.4.7", name, level: "A" | "AA" }   // sc must exist in the table in section 6

RepairPatch (discriminated on `op`)
  { op: "css",      css: string }                                         // add a CSS block to the level page
  { op: "attr",     selector, name, value: string | null }                // set, or remove when null
  { op: "text",     selector, text }
  { op: "behavior", name }                                                // a named behaviour the level page implements

Repair  { id, label (starts with a verb, at most 60 chars), patches: RepairPatch[] (at least 1),
          correct: boolean, why?: string }
        // a decoy (correct = false) must have `why`: one sentence, at most 20 words, saying why it fails
        // the correct repair must not have `why`

Ghost   { id (kebab-case, unique in the level), name, line (at most 14 words, first person),
          barrier: BarrierKind, wcag: Wcag[] (at least 1), selector (non-empty CSS selector),
          lesson (at most 40 words), releaseLine (at most 14 words),
          seenBy: { axe: boolean, levelCheck: boolean, walk: boolean },   // at least one must be true
          repairs: Repair[] (2 to 4, exactly one correct) }

Level   { id (kebab-case), chapter: ChapterId, title, look (a look file id), page (path of the page),
          exit: { selector }, ghosts: Ghost[] (1 to 8, ids unique), hiddenNote?: string }
```

`parseLevel(input: unknown)` returns `{ ok: true, level } | { ok: false, errors: { code, path, message }[] }`. Error codes (fixed): `level-id-invalid`, `ghost-count`, `ghost-id-duplicate`, `repair-count`, `no-correct-repair`, `multiple-correct-repairs`, `decoy-without-reason`, `correct-with-reason`, `line-too-long`, `wcag-unknown`, `selector-empty`, `layers-none`, `exit-selector-missing`, `patch-invalid`, plus `schema-invalid` (added after the spec audit) for input whose shape cannot be read (not an object, a wrong type, an unknown chapter) and that no other code explains. Problems found by the shape check are translated to the named codes by their path: a missing or empty ghost `selector` is `selector-empty`, a missing or empty `exit.selector` is `exit-selector-missing`, anything wrong inside a patch is `patch-invalid`, an unknown WCAG number is `wcag-unknown`. The rule checks run on everything that could be read, even when the shape check found problems. Report every error, not just the first.

## 6. WCAG 2.2 table (use exactly this; do not browse)

`src/engine/wcag.ts` exports it as data, plus `understandingUrl(sc)` = `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`.

| sc | name | level | slug |
|---|---|---|---|
| 1.4.3 | Contrast (Minimum) | AA | contrast-minimum |
| 1.4.13 | Content on Hover or Focus | AA | content-on-hover-or-focus |
| 2.1.1 | Keyboard | A | keyboard |
| 2.1.2 | No Keyboard Trap | A | no-keyboard-trap |
| 2.2.2 | Pause, Stop, Hide | A | pause-stop-hide |
| 2.4.1 | Bypass Blocks | A | bypass-blocks |
| 2.4.3 | Focus Order | A | focus-order |
| 2.4.7 | Focus Visible | AA | focus-visible |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | focus-not-obscured-minimum |
| 2.5.7 | Dragging Movements | AA | dragging-movements |
| 3.3.1 | Error Identification | A | error-identification |
| 3.3.2 | Labels or Instructions | A | labels-or-instructions |
| 4.1.2 | Name, Role, Value | A | name-role-value |
| 4.1.3 | Status Messages | AA | status-messages |

## 7. Engine API (pure; names are fixed, shapes are yours)

- `createEngine(overrides?)`: builds the engine from small rule functions (`validate`, `pick`, `release`, `snapshot`, `restore`, `ambient`, `canonical`; `validate` decides which actions are allowed). `overrides` exists only so tests can inject broken rules (mutants, section 9). Production code never passes it.
- `createGame(level, seed)` returns a `GameState`. State holds, per ghost: `status` (`haunting` | `released`), `picked` (repair id or null), `attempts`; plus a bounded undo history (limit 100), a step counter and the seed. `GameState` is plain data: it survives `JSON.parse(JSON.stringify(state))` unchanged (no Map, Set, class, function or undefined). `restoreGame(level, saved: unknown)` returns a valid `GameState` or `null` (it checks the shape and runs `checkInvariants`); the shell will use it to resume saved progress.
- `step(level, state, action)` returns `{ state, events }`. Actions: `meet(ghost)`, `repair(ghost, repair)`, `undo`, `reset` (ghost and repair are ids). `meet` changes nothing: it returns the same state object, adds no history and does not move the step counter, which counts accepted `repair`, `undo` and `reset` actions only.
- Rules: a ghost has at most one picked repair; picking another replaces it and counts an attempt. A correct repair releases the ghost. A decoy leaves it haunting and emits the decoy's `why`. A released ghost cannot be changed (the action is rejected) except by undo or reset. `reset` puts every ghost back to haunting with nothing picked and 0 attempts. It is undoable like a repair (it pushes one history entry), so `undo` brings the old state back.
- Events (fixed kinds, exported as `EVENT_KINDS` because the shell will announce each one): `ghost-met`, `repair-chosen`, `focus-restored`, `ghost-released`, `level-solved`, `undone`, `level-reset`, `nothing-to-undo`, `rejected` (with a reason: `unknown-ghost`, `unknown-repair`, `already-released`). A correct repair emits `repair-chosen`, then `focus-restored`, then `ghost-released`, then `level-solved` if it was the last. `reset` emits `level-reset` (never `undone`). Every event carries the ids it is about, so the shell needs no lookup: `repair-chosen` also carries `correct` and, for a decoy, its `why`; `ghost-released` carries the ghost's `releaseLine`; `rejected` carries its reason.
- Selectors: `isSolved`, `remaining`, `progress`, `activePatches(level, state)` (the patches of every ghost's picked repair, correct or not, because the player tests a wrong repair on the page and sees it fail; a deterministic order: ghost order, then patch order), `ambient(level, state)` and `canonical(state)` (a stable string that ignores history, attempts and the step counter).
- `ambient` is a number from `AMBIENT_MIN` (0.15) up to 1: `AMBIENT_MIN` when nothing is released, 1 when everything is, never decreasing as ghosts are released. The look and sound will read it.
- `src/engine/rng.ts`: a seeded generator with serialisable state: `next()`, `int(min, max)`, `pick`, `shuffle`, `fork(label)`. No global state, no `Math.random`.
- `checkInvariants(level, state)` returns a list of violations (empty when sound). The fuzz property uses it.

## 8. Properties (all required, each a fast-check test with at least 200 runs)

- P1 Idempotent: choosing the same repair for a ghost twice gives the same canonical state as once.
- P2 Commutes across ghosts: actions that target different ghosts can be reordered without changing the final canonical state.
- P3 Every ghost is necessary: for any valid level, leaving any one ghost's correct repair out leaves the level unsolved.
- P4 Sufficient: applying every ghost's correct repair, in any order and with decoys tried first, solves the level.
- P5 Undo restores: after any state-changing action (`repair` or `reset`), `undo` returns exactly the previous canonical state. With empty history it changes nothing and emits `nothing-to-undo`.
- P6 Ambient is bounded and monotone: always within [`AMBIENT_MIN`, 1], equal to `AMBIENT_MIN` when nothing is released and to 1 when everything is, and never lower after one more ghost is released (without undo).
- P7 Seeded randomness: the same seed gives the same sequence; forks with different labels are independent; `shuffle` returns a permutation; `pick` returns a member.
- P8 Fuzz: any sequence of valid and invalid actions never throws, and `checkInvariants` stays empty. Invalid actions change nothing and emit `rejected`. The test deep-freezes every level and state it passes in (an in-place change throws), checks that `step` with the same inputs gives deep-equal results, and checks that every state survives a JSON round trip and `restoreGame`.
- P9 Data: every generated valid level parses and round-trips through JSON; breaking exactly one rule in a valid level fails with exactly the matching error code.
- P10 Decoys never release: picking a decoy never releases the ghost and always emits that decoy's `why` word for word (in the `repair-chosen` event).
- P11 Patches mirror the picks: after any action, `activePatches` holds exactly the patches of every ghost's picked repair, decoys included, in ghost order then patch order; after `undo` it equals what it was before the undone action; after `reset` it is empty.

## 9. Tests that prove the tests

- Arbitraries (`tests/property/arbitraries.ts`): a valid-level generator and an action-sequence generator.
- Mutants (`tests/property/engine/mutants.test.ts`): at least 10 deliberately broken engines built with `createEngine(overrides)` (for example: a repair that is not idempotent, one that depends on order, undo that forgets a field, a reset that cannot be undone, a necessary ghost that does not count, an ambient that falls back to `AMBIENT_MIN` when the last ghost is released, a decoy that releases, a `validate` that lets an unknown id through and then crashes, a rule that changes the state it was given in place, an `activePatches` that ignores decoy picks). For each, assert that the matching property fails. A property that cannot fail is not a property.
- Purity: an ESLint rule set for `src/engine/**` forbids `window`, `document`, `localStorage`, `sessionStorage`, `fetch`, `performance`, `navigator`, timers, `requestAnimationFrame`, `Math.random`, `Date.now`, `new Date`, and imports from `src/fx`, `src/ui`, `src/audio`, `src/checks`, `src/hunt`. A unit test uses ESLint's Node API to lint a deliberately bad snippet and expects errors.
- Unit tests for the WCAG table (14 rows, urls), `parseLevel` error codes, and two fixture levels in `tests/fixtures/levels/` (a valid 3-ghost level and a set of single-fault variants).

## 10. Rules for tasks.md

- No task is optional. Do not use the optional marker (`*`), including for every property test and mutant.
- Each task lists the files it creates or edits. Two tasks that can run at the same time must not edit the same file.
- The barrel `src/engine/index.ts`, the ESLint change and the docs are their own tasks, near the end.
- H1 (housekeeping, last but one): make `playwright.config.ts` read the port from `E2E_PORT`, then from the first line of `.local/e2e-port`, else 5183 (the dev server command uses the same port). Do not run Playwright.
- The final task runs `npm run format`, then `npm run check`, then twice more with `FC_SEED=1` and `FC_SEED=2` (make fast-check read that variable), then appends the log entry.

## 11. Definition of done

- Every task done; `npm run check` green (typecheck, lint, format:check, tests, asset check) and green again with two other seeds.
- All 11 properties and at least 10 mutants pass; the purity test passes.
- `docs/architecture/engine.md` has a Mermaid diagram, the API table and the properties with one line each on the bug it would catch. `src/engine/README.md` is updated.
- `docs/KIRO_LOG.md` has a dated entry: what was built, counts (requirements, tasks, properties, mutants, tests) and surprises.
- Final reply in five lines: what exists; the test counts; anything the brief got wrong; anything you assumed; the credit cost if Kiro shows it.

## 12. Amendments (Nov 14, after the owner audited the first spec)

The first spec was good. These nine changes close real gaps; they are already merged into the sections above, and this list is only the trail.

1. `schema-invalid` is the 15th error code, and shape problems map to the named codes by path (section 5).
2. `validate` is an overridable rule, so a mutant can break validation (section 7).
3. `restoreGame` and the "plain data" rule for `GameState` (section 7).
4. `meet` returns the same state; the step counter counts only `repair`, `undo` and `reset` (section 7).
5. `reset` is undoable and emits the new `level-reset` event, not `undone`, so a screen reader never hears "undone" after a reset (sections 7 and 8, P5).
6. Events carry their ids and the story text the shell announces (section 7, P10).
7. `activePatches` includes decoy picks, so the player can test a wrong repair on the page and see it fail, and the proof checks can run it (section 7, P11).
8. P6 also checks both ends of `ambient`; P8 deep-freezes its inputs, checks determinism and the JSON round trip (section 8).
9. Eleven properties and at least ten mutants (sections 8, 9 and 11); `tests/property/fc-config.ts` is owned by this spec (section 3).
