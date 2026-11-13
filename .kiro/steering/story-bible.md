---
inclusion: fileMatch
fileMatchPattern: ["story/**", "levels/**"]
---
# Story bible

> Approved by the project owner on Nov 13 2026. Loaded only when working on `story/` and `levels/`. Counts and chapter names follow the project plan (kept outside this repo); if a count ever disagrees with a file in the repo, ask before changing it.

---

## In one minute

- **The House** is a website built in a hurry by a machine that never tried the keyboard.
- Visitors who got stuck became **ghosts of unfinished visits**. You are **the Lamplighter**; your lamp is your keyboard focus.
- Repair the barrier and the ghost finishes its visit and walks into the light. In the Attic you find the builder's notes. At the end you **ward the house**: you take home the Ward (a Kiro hook) and the Power, so the next machine-written ghost never appears.
- **Tone:** quiet, candle-lit, a little mischievous. No gore, no jump scares. Ghosts are *unfinished visits*, never people with impairments.

---

## 1. Voice and words

1. Short sentences: at most 14 words. Present tense. Plain words a 12-year-old knows.
2. Each ghost speaks **one line, in the first person, about the barrier** (Section 3). Nothing about the person.
3. The builder is "the Builder", a machine in a hurry. We are gentle with it: it was fast, not wicked. Never mock developers.
4. Humour is dry and small: one raised eyebrow, not a joke every line.
5. US spelling. Interface labels start with a verb ("Open the Grimoire", "Choose a repair").
6. Say **"people who use a keyboard"** and **"people who use a screen reader"**. Never ask the player to "feel what they feel".

**Words we never use:** blind, deaf, crippled, lame, "suffer from", "wheelchair-bound", "handicapped", "normal people"; any claim that the game or a page is "fully accessible"; any real company, product or person; anything about jobs being taken.

---

## 2. Chapters, title cards and the story beat

| Card | Verb | Intro line (typed on screen) | Beat |
|---|---|---|---|
| **The Porch** (prologue) | Tab | "Every website is a house." | The light dies for the first time and you bring it back. You learn: **Tab moves the light** |
| **I. The Foyer** | See and name | "The hall is warm. Nobody left a lamp on." | First ghosts; the first rack-focus snap-back |
| **II. The Chapel** | Escape | "A good room has a way out." | Bars close around you, then lift |
| **III. The Gallery** | Time and motion | "Some things refuse to hold still." | The paintings come alive; the carousel finally pauses |
| **IV. The Library** | Read and write | "Words are kind when they say what they are." | Ink fades, then re-inks |
| **V. The Attic** | Order and meaning | "The Builder left its notes up here." | The page scrambles and re-forms; the notes explain everything |
| **The Door** (finale) | Ward the house | "Dawn." | The ghosts walk out into the light; **"Now ward the house."** |

**Prologue text, in order (one line at a time):** "Every website is a house." / "A machine built this one in a hurry. It never tried the keyboard." / "Some visitors never got past the door. They are still here." / "You carry the lamp. The lamp is your focus. Press Tab."
After the first Tab: "Good. The light follows you." After the first repair: "A lamp needs a ring to shine. Keep it."

---

## 3. The cast (13 ghosts, 2 optional, and the Poltergeist)

The **right repair** is described in plain words; the level files and the Grimoire carry the details. WCAG numbers and names were checked on the W3C pages on Nov 13.

| Ghost | WCAG | Barrier | Its line | Silhouette and how it behaves | Right repair | Release line |
|---|---|---|---|---|---|---|
| **Invisible** | 2.4.7 | Focus outline removed | "I couldn't tell where I was." | A figure drawn only where the light touches its edge; vanishes when you look straight at it | Show a visible focus ring | "Now I can see where I am." |
| **Faceless** | 4.1.2 | Icon-only button with no name | "Nobody told me what this button did." | A figure with an empty oval where a face should be | Give the button an accessible name | "Now I know what it does." |
| *Hallway* (optional) | 2.4.1 | No skip link before 30 links | "I had to walk past every door." | A long figure in a corridor of identical doors | Add a "skip to main content" link first | "Straight to the main room." |
| **Caged** | 2.1.2 | Keyboard trap in a pop-up | "I only wanted to close it." | A figure inside bars that tighten each Tab | Let Esc and a Close button leave | "Out." |
| **Lost** | 2.4.3 | Focus not returned after closing | "I closed it, and then I was nowhere." | A figure that keeps turning to look behind it | Return focus to the button that opened the pop-up | "I know where I am." |
| **Restless** | 2.2.2 | Auto-advancing carousel, no pause | "It moved before I finished reading." | A figure that is always half out of the frame | Add a keyboard-reachable pause | "I can finish reading." |
| **Shy** | 2.1.1, 1.4.13 | Menu opens only on hover | "It only showed itself when you pointed." | A figure that hides behind a curtain | Open on focus or Enter, not only hover | "It shows itself when I ask." |
| **Dragged** | 2.5.7, 2.1.1 | Slider works only by dragging | "I could only drag it. I couldn't press anything." | A figure pulled along on a string | Add arrow keys or plus and minus buttons | "Now I can press." |
| *Hidden* (optional) | 2.4.11 | Sticky header covers the focus | "I was right there, under the banner." | A figure half hidden by a banner | Keep the focused item clear of the header | "Here I am, in plain sight." |
| **Faded** | 1.4.3 | Low-contrast text | "I couldn't read what I was writing." | Grey ink that sinks into grey paper | Raise the contrast to at least 4.5 to 1 | "I can read it." |
| **Placeholder** | 3.3.2, 4.1.2 | Field with no label | "The box forgot to say what it wanted." | A figure holding an empty frame | Add a visible label tied to the field | "The box says what it wants." |
| **Silent** | 3.3.1, 4.1.3 | Error not announced | "I got it wrong, and nothing told me." | A figure whose mouth moves without a sound | Announce the error and say what to fix | "Thank you for telling me." |
| **Maze** | 2.4.3 | Positive tabindex scrambles the order | "The order made no sense." | A figure that is split into pieces in the wrong order | Remove the positive tabindex; fix the order | "In order at last." |
| **Mirage** | 2.1.1, 4.1.2 | Clickable div that is not focusable | "It looked like a button." | A shimmering outline of a button | Use a real button | "It's a real button." |
| **Poltergeist** | several | Several fixes re-broken in a hurry | "Every fix undone in a hurry." | A whirl of every earlier silhouette | Re-apply the fixes in a short sequence | "...Fine. You win. This time." |

Rules for every ghost: 2 to 4 repair choices, **exactly one right**, and every wrong one has a one-line reason it fails. Each ghost has a Codex entry (Section 6) and a way to **run into the barrier before you fix it** (for example, the Invisible's light cannot find its edge). The point is the barrier in the page, never a simulation of a person.

---

## 4. The hidden notes (one per chapter, text only)

Found by tabbing to an unlabelled corner. They read like comments the Builder left in its code.

| Chapter | Note |
|---|---|
| Foyer | `// built in a hurry. looks fine on my screen.` |
| Chapel | `// TODO: let people close this.` |
| Gallery | `// faster carousel = more engagement?` |
| Library | `// placeholder text is basically a label.` |
| Attic | `// TODO: test with keyboard.` |

The Attic note is the reveal. After it the game says: "The Builder never tried the keyboard. Now you have."

---

## 5. The ending

Title card: **"Now ward the house."** Then the Take it home screen (the Ward, a steering file and the Power). Last line: **"The next ghost is one prompt away. Keep the light on."**

---

## 6. The Codex entry (the same shape every time)

1. **Name** of the ghost and its one line.
2. **What it is** in one sentence.
3. **Who it affects**, said neutrally ("people who use a keyboard").
4. **The rule:** the WCAG number and name.
5. **The repair** in two or three plain steps.
6. **Before and after code**, short, written by Kiro for the level.
7. **Test it:** the Tab test in one sentence.

---

## 7. The narrator panel (what a screen reader would say)

Format: **role, name, state.** For example: "Button. Close dialog." For a broken one: "Button. No name." Never decorate it, and never put a joke in it: it is a teaching tool.

---

## 8. Checks Kiro must run on story files

- Every ghost has all the columns in Section 3, and exactly one right repair.
- No line is longer than 14 words (title cards and notes excluded).
- No banned word from Section 1 appears.
- Every WCAG number and name matches the list above.
