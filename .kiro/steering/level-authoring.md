---
inclusion: fileMatch
fileMatchPattern: ["levels/**"]
---
# Authoring a level
A level is a real HTML page plus ghosts.json. The page contains deliberate barriers, and a ?fixed=1 version with every ghost already repaired.
Each ghost has: id, a CSS selector that matches exactly one element, a WCAG 2.2 reference, a short lesson in plain words, and 2 to 4 repair choices. Exactly one repair is correct. Every decoy explains why it fails.
Each ghost also lists which layers can see it: axe, level-check, walk. Be honest: axe may not flag a clickable div that is not focusable (it cannot see click handlers), and it may pass a page with no skip link if the page has a heading.
Every level has an exit element reachable with the Tab key once all ghosts are repaired. The shell's Menu landmark stays reachable even inside a trap. Use fictional names only. Follow story-bible.md for every line of text.
