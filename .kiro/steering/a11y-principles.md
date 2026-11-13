---
inclusion: always
---
# Accessibility rules for the game's own screens (the shell)
- Every interactive element has a visible focus style. Never write "outline: none" or "outline: 0" in src/ unless the same rule gives a clearly visible replacement. Use :focus-visible.
- There is a skip link on every screen and a persistent Menu button in its own landmark. No keyboard traps in the shell. The "?" key is a shortcut only, because screen readers can swallow keys in browse mode.
- Every game event (ghost met, repair chosen, focus restored, ghost released) is announced in a polite live region. Every sound has a caption shown on screen and announced when sound captions are on.
- Text contrast at least 4.5:1 in every look. No flashing above 3 per second. Respect prefers-reduced-motion. Sound is off by default.
- Use real buttons and links, labels on form controls, alt text on meaningful images.
- Say "barriers" and "people who use a keyboard". Never frame disability as something to "feel". The game is about fixing the barrier.
The haunted levels in levels/ contain barriers on purpose. These rules do not apply inside levels/, but each level's ?fixed=1 version must pass axe.
