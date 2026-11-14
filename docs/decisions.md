# Decisions

Short records of choices that shape the whole project: what we chose, why, and the cost we accept. To change one, add a new entry that replaces it.

## D1 (Nov 14): Haunted levels are standalone pages in a same-origin iframe

A level is a real HTML page (`levels/<chapter>/index.html`) loaded in an iframe from the same origin. The game's own screens (the shell) stay outside the frame.

- Why: a level can be scanned on its own (`?fixed=1`), its barriers and its scripts (traps, carousels) cannot leak into the game's own screens, and the Menu stays reachable when the page traps focus. Default mode can ignore the pointer inside the frame with `pointer-events: none`.
- Cost: the light must find the focused element inside the frame and add the frame's offset; the frame needs a title; axe runs in the frame as well as in the shell.
- Rejected: injecting level HTML into the shell page (styles and traps leak, scripts do not run) and Shadow DOM (scripts do not run, so the level would not be a real page).

## D2 (Nov 14): Data is validated with zod; the engine is pure

Every data file (levels, ghosts, looks, story, sound sets) has a zod schema in the code that owns it, and TypeScript types come from the schemas. zod (MIT) is the only runtime dependency besides Preact and axe-core. Code in `src/engine` uses no DOM, clock or randomness, and ESLint enforces it.

## D3 (Nov 14): Logic runs in Node, layout runs in a browser

Unit and property tests run in Node with no DOM emulation, because jsdom has no layout and would give false confidence. Anything that needs layout, focus or painting is a Playwright test in Chrome.

## D4 (Nov 14): No timing assertions in tests that gate a merge

Frame times, probe results and animation lengths are measured by `tools/bench` scripts that print tables; they never fail `npm run check` or `npm run e2e`. Tests wait for a condition or step a manual clock. Why: this machine runs several editor and agent windows at once, and the first rack-focus tests failed from machine load alone.

## D5 (Nov 14): Specs are Quick Specs written from owner briefs

Each spec starts from a brief in `docs/briefs/` that holds the owner's decisions and answers every clarifying question. Kiro writes `requirements.md`, `design.md` and `tasks.md` from it; the owner reads them before "Run all tasks". If a spec and its brief disagree, the brief wins and the difference is noted in `design.md`. Why: speed without losing structure, traceability or the property tests.

## D6 (Nov 14): The look is a silent film, with props, and colour arrives at dawn

The whole game is shot like a 1920s silent horror film: hard light, black shapes, tinted film stock per chapter, grain and wear, the story told by title cards. Ordinary web parts (buttons, links, form fields, footer links) become objects in the house but stay real elements with the same names. The Finale is the first real colour of the game. The first pictures prove or reject this before anything else is built on it: brief `docs/briefs/film-look.md`.

- Why: the owner judged the first Foyer lab "naive" (stock buttons, a Privacy link, flat shapes in one brown). The light effect was right and what it lit was not. Silent film is cheap to draw in code (black shapes, one warm light, fog, grain forgive simple art), fits "no voice" (title cards), and makes the dawn colour reveal the payoff.
- Cost: more art work in the first chapter, and a look system built on tokens so each chapter is a tint. The approved look bible (Nov 13) changes after the owner approves the pictures; until then the film-look brief wins where they differ.
- Rejected: only dressing the page with props (no big idea), and a real-time lit scene with shaders (highest ceiling, but slow on weak machines and it would eat the schedule; it may come back for a few hero shots).
