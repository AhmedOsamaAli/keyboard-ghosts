# Engine

Pure game rules: no DOM, no clock, seeded randomness only. ESLint forbids the page, the clock, `Math.random` and imports from `src/fx`, `src/ui`, `src/audio`, `src/checks` and `src/hunt` in this folder.

The only public entry is `index.ts`. Do not import the other files from outside this folder.

| File | Holds |
|---|---|
| `wcag.ts` | the 14-row WCAG 2.2 table and `understandingUrl` |
| `words.ts` | word count, kebab-case and one-sentence checks |
| `schema.ts` | zod schemas and types for levels, ghosts, repairs and patches; the 15 error codes |
| `parse.ts` | `parseLevel`: shape check, then rule checks on everything it could read |
| `rng.ts` | seeded generator (`createRng`) with serialisable state |
| `events.ts` | `EVENT_KINDS` and the event and action types |
| `state.ts` | `GameState` (plain JSON data), `createGame`, `AMBIENT_MIN`, `HISTORY_LIMIT` |
| `rules.ts` | the rule functions (`validate`, `pick`, `release`, `snapshot`, `restore`, `reset`, `ambient`, `canonical`, `solved`, `activePatches`) |
| `selectors.ts` | `isSolved`, `remaining`, `progress`, `activePatches` |
| `invariants.ts` | `checkInvariants` |
| `restore.ts` | `restoreGame` |
| `engine.ts` | `createEngine(overrides?)` and `step` |
| `clamp.ts` | `clamp` |

Overview, API table, properties and mutants: [docs/architecture/engine.md](../../docs/architecture/engine.md).

Tests: `tests/unit/engine/`, `tests/property/engine/`, fixtures in `tests/fixtures/levels/`. Set `FC_SEED=<integer>` to repeat a property run.
