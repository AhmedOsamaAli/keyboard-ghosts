# Kiro log

## 2026-11-13

Added an event-recorder PreToolUse command hook (.kiro/hooks/event-recorder.json) and .kiro/scripts/record-event.mjs, which appends time and raw stdin to .local/events.jsonl and always exits 0. Extended the eslint Node globals to .kiro/scripts. Ran the test events (create hello.txt, echo recorder-test, delete hello.txt).

Surprises: the hook tool said the hook only becomes active at the next session start, and the test events did not fire it, so .local/events.jsonl was not created. I checked the script by hand in a temp folder (exit 0, one JSON line written). My first manual run wrote a stray .local in the repo, which I deleted. Real field names are still unrecorded; the test events need repeating in a new session.

## 2026-11-13 (focus-guard)

Added .kiro/scripts/focus-guard.mjs, tests/unit/focus-guard.test.ts (8 tests) and the blocking PreToolUse hook .kiro/hooks/focus-guard.json (matcher "write"). Set "enabled": false in event-recorder.json. Wrote them in that order, hook last.

Surprises: my first test run logged blocked events into the repo's docs/evidence/events.jsonl because most tests ran in the repo folder. I made the tests run in a temp folder by default and deleted the stray file. The hook tool again said it only activates next session, so it never fired while I worked.

## 2026-11-13: rack focus spike

Built `spikes/rack-focus/` (CSS backdrop-filter and mask-image overlay that follows `document.activeElement`), `tests/e2e/rack-focus.spec.ts`, and set the Playwright config to port 5183 and local Chrome (Chromium on CI). Tab, scroll and 200%/400% zoom checks pass. Frame-time numbers under CPU throttling were noisy, so no tier decision rests on them yet. Details in `spikes/rack-focus/RESULTS.md`. `src/` and `.kiro/` were not touched.

## 2026-11-13: rack focus spike, round 2

In spikes/rack-focus/: feathered gradient masks driven by CSS variables (no data URL per frame), a keyboard camera that glides focus toward the window centre in 260 ms, and a 1.5 s start-up probe that runs the real effect to pick the tier. Round 1 is kept as round1.html/round1.ts. Added bench.ts and shots.ts, 12 screenshots, new e2e checks, and a Round 2 section in RESULTS.md with 5 runs per cell in normal, --disable-gpu and CPU x4 modes. Round 2 looks better but did not beat round 1 in software rendering at tier 2; tier 1 is the safe default. Only spikes/rack-focus/, tests/e2e/rack-focus.spec.ts and this log were edited.

(The shell mangled a few characters when this entry was first appended; they were repaired by hand after the merge.)

## 2026-11-14: focus-guard live proof

- Step 1 (fs_write `outline: none`): BLOCKED. Step 2 (fs_write `:focus-visible` outline): ALLOWED. Step 3 (str_replace to `outline: none`): BLOCKED.
- Step 4 (str_replace `3px solid #ffd54a` to `0`): ALLOWED. The replacement text had no "outline" word, so the old guard missed it. This was the known weak spot, and it was real.
- Step 5 was needed and done. The guard now reads the file from disk, applies a str_replace in memory (all matches with replace_all), and checks the resulting text. If the file cannot be read it falls back to the old check, and any internal error still allows. Added unit tests for fs_append and str_replace. After the upgrade, repeating steps 2 and 4 gave ALLOWED then BLOCKED.
- Step 6: probe file deleted. `git status --short` shows nothing under src/.
- Surprise: the editor's format-on-save (not a Kiro hook) reformatted focus-guard.mjs to double quotes between my edits, so one edit missed its target and needed a re-read. Limit: a str_replace on a file that already holds a bad outline is now blocked even if the edit is unrelated.

## 2026-11-14: why the hooks did not fire earlier (note added after review)

Both Kiro windows were open in Restricted Mode (the folder was not trusted), so Kiro switched hooks off (its log said `hooks.v2.executionDisabledUntrustedWorkspace`) and asked before every terminal command. That, together with the "hooks load at session start" rule, is why the recorder wrote nothing. After the folder was trusted and the window reloaded, Kiro's log said `isTrusted=true`, both hooks loaded, the guard blocked live, and the live proof needed no approval prompts. Kiro's own code also confirmed the hook input (`session_id`, `hook_event_name`, `cwd`, `tool_name`, `tool_input`), that exit code 2 blocks a PreToolUse hook, and that the matcher `write` covers `fs_write`, `fs_append` and `str_replace`.

## 2026-11-14: level-engine
Built the pure engine in `src/engine/` (wcag, words, schema, parse, rng, events, state, rules, selectors, invariants, restore, engine, index) with unit tests in `tests/unit/engine/`, 11 property tests and 12 mutants in `tests/property/engine/`, the arbitraries, `tests/property/fc-config.ts` (reads `FC_SEED`), two fixture files, an ESLint purity rule set for `src/engine/**` with a test, `docs/architecture/engine.md` and an updated `src/engine/README.md`. `playwright.config.ts` now reads `E2E_PORT`, then `.local/e2e-port`, else 5183 (not run).
Counts: 49 requirements, 31 tasks, 11 properties (200 runs each), 12 mutants, 253 tests in 30 files in the whole repo. `npm run check` is green, and green again with `FC_SEED=1` and `FC_SEED=2`.
Surprises: the brief's rule list could not express three mutants (a necessary ghost that does not count, an activePatches that ignores decoys, a reset that cannot be undone), so Rules also holds `solved`, `activePatches` and `reset` (design.md Decisions 24). The rules task needs the selectors task first, so task 9 now lists task 10 in its After line. All 12 mutants failed their property on the first run.

## 2026-11-14: owner mutation check
Owner mutation check: 46 hand-made bugs, 40 caught first time, 6 new tests added

## 2026-11-14: audio-engine

Built the Web Audio engine in `src/audio/`: mix maths, variation, captions and their merger, the focus curve, seeded noise, the room impulse, analysis, zod schemas, 26 code-made voices with their numbers in `voices/defaults.json`, seven chapter sound sets, the loader plan, the master chain with the focus filter and the limiter, the beds, event playing, `createAudio` and `nullAudio`. Also: the sound lab (`labs/sound/`, with a `?tune=1` drawer), the render tool (`tools/sound/render.ts`, 33 spectrograms in `docs/evidence/sound/`), the extended asset check, `docs/architecture/audio.md` and two review rounds in `docs/evidence/sound/REVIEW.md`.

Counts: 31 requirements, 63 tasks. 88 unit and property tests in 26 files under `tests/unit/audio` and `tests/property/audio`: A1 to A8 at 200 runs each, and 10 mutants that each fail their property. 78 browser tests in 8 files under `tests/e2e/audio`: B1 to B7 and the lab, with 0 axe violations. The whole repo has 348 Node tests in 56 files. Every voice meets its brief §5 target.

Surprises:
- B5 failed first, by one bit. Chrome adds a node's inputs in an order that can change between runs, so the engine now sums at most two inputs per node (`graph/mixer.ts`).
- Chrome's compressor always adds +3.42 dB of make-up gain at these settings. My first guess left every level 1.7 dB high.
- `light-dies` plays its breath through the closed filter, so B7 measures that breath as `ghost-breath` instead.
- A tool write once went to `c:\dev\kg-wt\scripts\` (outside the worktree). I created that folder and file by mistake and removed them at once.

What the checks cannot see: whether anything sounds fake. The wind, fire, murmur and creaks need the owner's ears.
