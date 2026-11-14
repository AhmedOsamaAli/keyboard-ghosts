---
inclusion: always
---
# Structure
src/engine (pure rules) · src/ui (shell, Grimoire, Codex, settings, narrator, results, export) · src/fx (rack-focus renderer, shadows, silhouettes, particles) · src/audio (adaptive audio, captions) · src/checks (axe wrapper, per-ghost level checks, walk recorder) · src/hunt (Ghost Hunt generator and solver)
levels/<chapter>/ (index.html, ghosts.json, lesson text) · looks/<chapter>.json · story/ (lines, hidden notes, title cards) · assets/ (sounds, fonts, art, manifest.json, licences/)
labs/ (look labs: draft levels used to tune the look; may contain deliberate barriers; dev server only, never in the production build) · tools/bench/ (benchmarks that print tables and never gate a merge)
Levels are standalone pages hosted in a same-origin iframe; the shell is never inside the frame (docs/decisions.md, D1). Feature briefs live in docs/briefs/ and project-wide decisions in docs/decisions.md.
guard/ (rules.json, check-core.mjs, held-out samples) · power/keyboard-ward/ (plugin.json, skills/keyboard-ward/SKILL.md, skills/keyboard-ward/references/ghosts.md) · tools/ (axe-runner MCP server later)
spikes/ (throwaway experiments, each with a RESULTS.md; kept as evidence or deleted)
tests/unit · tests/property · tests/e2e · tests/visual · docs/ (KIRO_LOG.md, evidence/, architecture.md) · scripts/
.kiro/ is committed to git and must never be listed in .gitignore.
