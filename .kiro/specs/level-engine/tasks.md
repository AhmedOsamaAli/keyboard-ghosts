# Tasks: level-engine

Source: [brief §10](../../../docs/briefs/level-engine.md). Every task is required. Each task lists the files it creates or edits and the requirements it covers (see requirements.md). A task starts only when every task in its "After" line is done. Tasks in the same group with no dependency on each other can run together; no file appears in two tasks of a group.

Order of work: foundations (1 to 5), data and state (6 to 7), parser, rules and restore (8 to 12), engine (13), generators (14), properties (15 to 25), mutants (26), late tasks (27 to 29), housekeeping and finish (30 to 31).

## Foundations (run together)

- [x] 1. Add the fast-check settings
  - Create `tests/property/fc-config.ts`: `FC_SEED` parsing, `fcParams` (`numRuns` 200, `seed` when valid).
  - Create `tests/unit/engine/fc-config.test.ts`: valid seed, missing seed, non-integer seed.
  - Files: `tests/property/fc-config.ts`, `tests/unit/engine/fc-config.test.ts`
  - Covers: R41, R42. After: none.

- [x] 2. Add the WCAG table
  - Create `src/engine/wcag.ts`: the 14 rows (sc, name, level, slug), `understandingUrl(sc)`.
  - Create the unit test: 14 rows, each sc, name, level and url, unknown sc handling.
  - Files: `src/engine/wcag.ts`, `tests/unit/engine/wcag.test.ts`
  - Covers: R14, R38. After: none.

- [x] 3. Add the seeded generator
  - Create `src/engine/rng.ts`: mulberry32, `next`, `int`, `pick`, `shuffle`, `fork`, serialisable state.
  - Create the unit test: known first values, bounds of `int`, state save and restore, empty `pick` input.
  - Files: `src/engine/rng.ts`, `tests/unit/engine/rng.test.ts`
  - Covers: R23, R6. After: none.

- [x] 4. Add the word helpers
  - Create `src/engine/words.ts`: `countWords`, `isKebabCase`, `isSingleSentence`.
  - Create the unit test with edge cases (extra spaces, empty text, punctuation).
  - Files: `src/engine/words.ts`, `tests/unit/engine/words.test.ts`
  - Covers: R5, R11. After: none.

- [x] 5. Add the schemas and types
  - Create `src/engine/schema.ts`: zod 4 shape schemas for `ChapterId`, `BarrierKind`, `LayerId`, `Wcag`, `RepairPatch`, `Repair`, `Ghost`, `Level`; inferred types; `ERROR_CODES` (the 14 named codes plus `schema-invalid`, 15 in all).
  - Create the unit test: a valid level passes the shape check; each patch `op` shape; a wrong shape fails.
  - Files: `src/engine/schema.ts`, `tests/unit/engine/schema.test.ts`
  - Covers: R1, R2, R9, R13. After: none.

## Data and state (run together)

- [x] 6. Add the level fixtures
  - Create the valid 3-ghost level (JSON) and `single-faults.ts`: one variant for each of the 15 error codes, each differing from the valid level in one rule.
  - Words in the fixtures follow the story bible.
  - Files: `tests/fixtures/levels/valid-3-ghost.json`, `tests/fixtures/levels/single-faults.ts`
  - Covers: R38, R5. After: 5.

- [x] 7. Add events, state and `createGame`
  - Create `src/engine/events.ts`: `EVENT_KINDS` (9 kinds), the event types with the payloads of design.md, `Action` and `RejectReason`.
  - Create `src/engine/state.ts`: `GameState` and its zod schema (plain JSON data, no `undefined`), `AMBIENT_MIN`, `HISTORY_LIMIT`, `createGame`.
  - Create the unit test: initial state, seed stored, `EVENT_KINDS` has exactly the 9 kinds, a new state survives a JSON round trip unchanged.
  - Files: `src/engine/events.ts`, `src/engine/state.ts`, `tests/unit/engine/state.test.ts`
  - Covers: R16, R17, R19, R22, R48. After: 5.

## Parser, rules and restore (run together)

- [x] 8. Add `parseLevel`
  - Create `src/engine/parse.ts`: shape check, mapping of zod issues to codes by path, tolerant rule checks on the raw input, merge and de-duplicate by (code, path), every error with `code`, `path`, `message`.
  - Create the unit test: the valid fixture parses; each single-fault fixture gives exactly its code (all 15); `selector-empty`, `exit-selector-missing` and `patch-invalid` are reported for missing fields and for empty ones; one input with several faults reports every one of them; the rule checks still run when the shape check fails elsewhere; non-object input gives `schema-invalid`; no duplicate (code, path) pair.
  - Files: `src/engine/parse.ts`, `tests/unit/engine/parse.test.ts`
  - Covers: R10, R11, R12, R13, R38, R49. After: 2, 4, 5, 6.

- [x] 9. Add the rules
  - Create `src/engine/rules.ts`: the `Rules` type and `defaultRules` (`validate`, `pick`, `release`, `snapshot`, `restore`, `reset`, `ambient`, `canonical`, `solved`, `activePatches`).
  - Create the unit test for each rule on its own: `validate` gives each reject reason and passes a good action, replace a pick, release on a correct repair, decoy keeps haunting, ambient values at both ends, canonical ignores history, attempts and step, `activePatches` includes a decoy pick.
  - Files: `src/engine/rules.ts`, `tests/unit/engine/rules.test.ts`
  - Covers: R15, R18, R21, R22. After: 7, 10.

- [x] 10. Add the selectors
  - Create `src/engine/selectors.ts`: default `isSolved`, `remaining`, `progress`, `activePatches`.
  - Create the unit test: ghost order then patch order, a decoy pick is included, a haunting ghost with nothing picked adds nothing, a fresh state gives an empty list.
  - Files: `src/engine/selectors.ts`, `tests/unit/engine/selectors.test.ts`
  - Covers: R3, R21. After: 7.

- [x] 11. Add `checkInvariants`
  - Create `src/engine/invariants.ts` with the list from design.md Decisions 18.
  - Create the unit test: a sound state gives an empty list; one hand-broken state per invariant gives a violation.
  - Files: `src/engine/invariants.ts`, `tests/unit/engine/invariants.test.ts`
  - Covers: R24. After: 7.

- [x] 12. Add `restoreGame`
  - Create `src/engine/restore.ts`: `restoreGame(level, saved: unknown)` using the `GameState` schema and `checkInvariants`; returns a fresh copy or `null`.
  - Create the unit test: a JSON round trip of a played state restores; `null`, a string, a missing field, an extra `undefined`, a wrong ghost id, a released ghost with a decoy pick and a history of 101 entries all return `null`; the result is not the input object.
  - Files: `src/engine/restore.ts`, `tests/unit/engine/restore.test.ts`
  - Covers: R16, R47. After: 7, 11.

## Engine

- [x] 13. Add `createEngine` and `step`
  - Create `src/engine/engine.ts`: `createEngine(overrides?)`, the default engine, `step` (asks `validate` first) with `meet`, `repair`, `undo`, `reset`, rejections, event order, event payloads, the step counter rule and the 100-entry history limit.
  - Create the unit test: the event order for a correct repair; the last ghost emits `level-solved`; `repair-chosen` carries `correct` and the decoy's `why`; `ghost-released` carries `releaseLine`; each rejection reason with its ids; `meet` returns the same object and keeps the step counter; `undo`, and `undo` with empty history returns the same object; `reset` emits `level-reset` (never `undone`) and `undo` after it restores the old state; the history limit; `overrides` replaces a rule.
  - Files: `src/engine/engine.ts`, `tests/unit/engine/engine.test.ts`
  - Covers: R3, R15, R17, R18, R19, R20, R29, R48. After: 9, 10, 11, 12.

## Generators

- [x] 14. Add the arbitraries
  - Create `tests/property/arbitraries.ts`: `levelArb` (valid levels), `actionsArb(level)` (valid and invalid actions, including `reset` and `undo`), `faultArb` (a valid level with exactly one broken rule, for each of the 15 codes, with its expected code).
  - Create a unit test that checks `levelArb` output always parses, `faultArb` output gives its code, and the fault builder names equal `ERROR_CODES`.
  - Files: `tests/property/arbitraries.ts`, `tests/unit/engine/arbitraries.test.ts`
  - Covers: R35. After: 1, 6, 8, 13.

## Properties (run together; each task has its own files)

- [x] 15. P1 Idempotent
  - Files: `tests/property/engine/props/p1-idempotent.ts`, `tests/property/engine/p1-idempotent.test.ts`
  - The checker takes an engine so the mutant test can reuse it. Covers: R25. After: 14.

- [x] 16. P2 Commutes across ghosts
  - Files: `tests/property/engine/props/p2-commutes.ts`, `tests/property/engine/p2-commutes.test.ts`
  - Covers: R26. After: 14.

- [x] 17. P3 Every ghost is necessary
  - Files: `tests/property/engine/props/p3-necessary.ts`, `tests/property/engine/p3-necessary.test.ts`
  - Covers: R27. After: 14.

- [x] 18. P4 Sufficient
  - Files: `tests/property/engine/props/p4-sufficient.ts`, `tests/property/engine/p4-sufficient.test.ts`
  - Covers: R28. After: 14.

- [x] 19. P5 Undo restores (repair and reset)
  - Files: `tests/property/engine/props/p5-undo.ts`, `tests/property/engine/p5-undo.test.ts`
  - Covers: R29. After: 14.

- [x] 20. P6 Ambient is bounded and monotone (both ends)
  - Files: `tests/property/engine/props/p6-ambient.ts`, `tests/property/engine/p6-ambient.test.ts`
  - Covers: R30. After: 14.

- [x] 21. P7 Seeded randomness
  - Files: `tests/property/engine/p7-rng.test.ts`
  - No arbitraries needed. Covers: R31. After: 1, 3.

- [x] 22. P8 Fuzz (deep freeze, determinism, JSON round trip, `restoreGame`)
  - Files: `tests/property/engine/props/p8-fuzz.ts`, `tests/property/engine/p8-fuzz.test.ts`
  - The deep-freeze helper lives in `p8-fuzz.ts`. Covers: R32. After: 12, 14.

- [x] 23. P9 Data (one fault per code)
  - Files: `tests/property/engine/p9-data.test.ts`
  - Covers: R33. After: 14.

- [x] 24. P10 Decoys never release
  - Files: `tests/property/engine/props/p10-decoys.ts`, `tests/property/engine/p10-decoys.test.ts`
  - Covers: R34. After: 14.

- [x] 25. P11 Patches mirror the picks
  - Files: `tests/property/engine/props/p11-patches.ts`, `tests/property/engine/p11-patches.test.ts`
  - Covers: R46. After: 14.

## Mutants

- [x] 26. Prove the properties can fail
  - Create `tests/property/engine/mutants.test.ts` with the 12 mutants of design.md, each built with `createEngine(overrides)`. For each one, assert that the matching checker fails and the real engine passes it.
  - Files: `tests/property/engine/mutants.test.ts`
  - Covers: R36. After: 15, 16, 17, 18, 19, 20, 22, 24, 25.

## Late tasks (run together: 27, 28, 29)

- [x] 27. Add the barrel
  - Create `src/engine/index.ts`: export the public API (schemas, types, `parseLevel`, `createEngine`, `createGame`, `restoreGame`, `step`, selectors, `ambient`, `canonical`, `checkInvariants`, `EVENT_KINDS`, `AMBIENT_MIN`, rng, wcag, `clamp`). No default export.
  - Create `tests/unit/engine/barrel.test.ts`: the barrel exports every name of the API list.
  - Files: `src/engine/index.ts`, `tests/unit/engine/barrel.test.ts`
  - Covers: R1, R8. After: 26.

- [x] 28. Add the purity rules
  - Edit `eslint.config.js`: for `src/engine/**` only, forbid the globals, `Math.random`, `Date.now`, `new Date`, and the imports of R37.
  - Create the unit test that lints a bad snippet with ESLint's Node API and expects an error for each forbidden name; also lints a clean snippet and expects none.
  - Files: `eslint.config.js`, `tests/unit/engine/purity.test.ts`
  - Covers: R6, R37. After: 26.

- [x] 29. Write the docs
  - Create `docs/architecture/engine.md`: Mermaid diagram, API table, the 11 properties with one line each on the bug it would catch, the mutants table.
  - Edit `src/engine/README.md`.
  - Files: `docs/architecture/engine.md`, `src/engine/README.md`
  - Covers: R43. After: 26.

## Housekeeping and finish

- [x] 30. H1: read the e2e port
  - Edit `playwright.config.ts`: port from `E2E_PORT`, then the first line of `.local/e2e-port`, else 5183; the dev server command uses the same port. Do not run Playwright.
  - Files: `playwright.config.ts`
  - Covers: R40. After: 27, 28, 29.

- [x] 31. Final run and log
  - Run `npm run format`, then `npm run check`, then `npm run check` with `FC_SEED=1`, then with `FC_SEED=2`. Fix failures in the file that owns them.
  - Append the dated entry to `docs/KIRO_LOG.md`: what was built, counts (requirements 49, tasks 31, properties 11, mutants 12, tests), surprises.
  - Files: `docs/KIRO_LOG.md` (and any file `npm run format` rewrites)
  - Covers: R41, R42, R44, R45. After: 30.
