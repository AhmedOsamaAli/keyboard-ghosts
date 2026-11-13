# Kiro log

## 2026-11-13

Added an event-recorder PreToolUse command hook (.kiro/hooks/event-recorder.json) and .kiro/scripts/record-event.mjs, which appends time and raw stdin to .local/events.jsonl and always exits 0. Extended the eslint Node globals to .kiro/scripts. Ran the test events (create hello.txt, echo recorder-test, delete hello.txt).

Surprises: the hook tool said the hook only becomes active at the next session start, and the test events did not fire it, so .local/events.jsonl was not created. I checked the script by hand in a temp folder (exit 0, one JSON line written). My first manual run wrote a stray .local in the repo, which I deleted. Real field names are still unrecorded; the test events need repeating in a new session.

## 2026-11-13 (focus-guard)

Added .kiro/scripts/focus-guard.mjs, tests/unit/focus-guard.test.ts (8 tests) and the blocking PreToolUse hook .kiro/hooks/focus-guard.json (matcher "write"). Set "enabled": false in event-recorder.json. Wrote them in that order, hook last.

Surprises: my first test run logged blocked events into the repo's docs/evidence/events.jsonl because most tests ran in the repo folder. I made the tests run in a temp folder by default and deleted the stray file. The hook tool again said it only activates next session, so it never fired while I worked.

## 2026-11-14: focus-guard live proof

- Step 1 (fs_write `outline: none`): BLOCKED. Step 2 (fs_write `:focus-visible` outline): ALLOWED. Step 3 (str_replace to `outline: none`): BLOCKED.
- Step 4 (str_replace `3px solid #ffd54a` to `0`): ALLOWED. The replacement text had no "outline" word, so the old guard missed it. This was the known weak spot, and it was real.
- Step 5 was needed and done. The guard now reads the file from disk, applies a str_replace in memory (all matches with replace_all), and checks the resulting text. If the file cannot be read it falls back to the old check, and any internal error still allows. Added unit tests for fs_append and str_replace. After the upgrade, repeating steps 2 and 4 gave ALLOWED then BLOCKED.
- Step 6: probe file deleted. `git status --short` shows nothing under src/.
- Surprise: a save hook reformatted focus-guard.mjs to double quotes between my edits, so one edit missed its target and needed a re-read. Limit: a str_replace on a file that already holds a bad outline is now blocked even if the edit is unrelated.
