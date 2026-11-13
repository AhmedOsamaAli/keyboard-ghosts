---
inclusion: always
---
# Keyboard Ghosts: product
A browser game for the Kiroween 2026 hackathon (Costume Contest). A dark, haunted web page is lit only by the keyboard focus. Rack focus: what is focused is lit and sharp, the rest sinks into soft shadow. Each ghost is a real accessibility barrier shaped like the problem it stands for. The player repairs it and the light returns. After the story there is Ghost Hunt (endless, provably solvable cases). At the end the game exports a Kiro hook (the Ward) and a Kiro Power.
Audience: web developers, designers, QA, students. Desktop and keyboard first.
Story and tone: story-bible.md. Look: look-bible.md. Sound: sound-bible.md.
Rules for every change:
- The player's own Tab key is the truth. Never simulate key presses inside the page. The only scripted focus changes allowed are in Director Mode (?demo=1&director=1), which exists only to film the game. Playwright runs are called "automated Tab tests", never "real keys" or "a person".
- Say what each check cannot see. Never claim "WCAG compliant" or "fully accessible".
- The shell (title, Menu, Grimoire, Codex, settings, results, export) must pass axe with zero violations and never trap focus. The Menu is a persistent button in its own landmark; the "?" key is only a shortcut and is never required.
- Assist mode must always exist: the pointer works inside haunted pages, the walk is optional, hints are on, and results are labelled "assisted".
- Nothing leaves the device: no analytics, no outside requests other than loading the app.
- Fictional content only: no real brands, websites or people.
Out of scope: pasting or loading outside HTML, accounts, backends, phone play, a keyboard simulation, voice-over, AI-generated pictures or footage.
