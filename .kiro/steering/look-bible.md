---
inclusion: fileMatch
fileMatchPattern: ["looks/**", "src/fx/**"]
---
# Look bible

> Approved by the project owner on Nov 13 2026. Loaded only when working on `looks/` and `src/fx/`. The numbers are **starting values**: the owner tunes them by eye with the `?tune=1` sliders, then they are locked in.
>
> **Nov 14 update (decision D6):** the owner chose the silent-film direction. Until the owner approves the film-look pictures, `docs/briefs/film-look.md` wins over this file for the Foyer palette, the grade and the atmosphere (tone ramps, film wear, title cards, bokeh). Sections 2, 3 and 6 to 9 stand. This file is rewritten after the approval.

---

## In one minute

- **One idea, everywhere: Rack Focus.** What is focused is lit and sharp; everything else sinks into soft, dark shadow. Lose the focus ring and the picture drifts out of focus and the light dies. A repair snaps it back.
- **Six looks**, one per chapter, so it never feels repetitive: warm candle, cold stained glass, theatre track lights, green banker lamps, moonlight and one swinging bulb, and dawn.
- **Style, not realism.** Silhouettes, light, camera and sound make it feel like a film. We do not chase 3D detail we cannot afford.
- **Safe and kind:** text contrast at least 4.5 to 1 in every look, no flashing above 3 times a second, and a finished "Lights On" daylight look, not a plain fallback.

---

## 1. The six looks (starting palettes)

`ink` is the dark base everywhere. `text` is checked against it by the look-guard; if a pair fails, Kiro adjusts it until it passes.

| Look | Light | Palette (ink · light · accent · text) | Grade notes |
|---|---|---|---|
| **Porch and Foyer** | Warm candle, gentle flicker | `#0d0a08` · `#f6b95c` · `#8a5a2b` · `#f4e6cf` | Soft, nostalgic; amber shadows |
| **Chapel** | Cold shafts through stained glass | `#0b0f1c` · `#9fb8e8` · `#7a5cc4` · `#e6ecfa` | High contrast, cool; violet in the dark |
| **Gallery** | Track lights on paintings | `#100a0a` · `#fff3dc` · `#8c1f2a` · `#fff6e6` | Clean, theatrical; deep red walls |
| **Library** | Green banker lamps | `#0a120e` · `#7fd0a8` · `#c49a4a` · `#eaf3e3` | Intimate, low key; brass highlights |
| **Attic** | Moonlight through slats, one swinging bulb | `#0c0e11` · `#dfe8f5` · `#ffcf7a` · `#f0f3f6` | Grainy, desaturated; the bulb is the only warm thing |
| **Finale (dawn)** | The first colour of day | `#1b2733` · `#f5c96a` · `#9ec9f0` · `#2a2118` (dark text on light panels) | The first colour in the whole game |
| **Lights On** (a setting) | Even daylight | Cream `#fbf3e1`, ink text `#2a2118`, each chapter's accent | A designed "daylight storybook", same shapes, no blur |

---

## 2. Light and focus (starting numbers, tier 2)

| Thing | Starting value | Notes |
|---|---|---|
| Padding around the focused item | 20 px beyond the focus ring | The ring is never blurred |
| Corner of the lit "hole" | The item's own corner plus 12 px | Follows the item's shape |
| Blur outside the light | Ramps from 0 at the edge of the lit core to 12 px over 120 px | Tier 1 has no blur; it uses darkness only. Replaces "6 px near, 12 px far" after the spike |
| Darkness outside the light | 0 at the core edge, 55% by 20 px, 78% by 120 px | Replaces 62% / 82% after the spike (the old numbers made neighbours unreadable) |
| Light glide to a new focus | 260 ms, ease-out with a 6% overshoot | Like a focus pull |
| Light dying (no focus ring) | 900 ms to 90% dark and 14 px blur | |
| Snap-back on repair | 320 ms, with a 40 ms warm bloom | Followed by a slow-motion beat |
| Slow-motion beat | 600 ms at 35% speed | Skipped with reduced motion |
| Candle flicker | At most a 6% brightness change, at most 2.5 times a second | Far below the flash limit |
| Grain | 5% strength, stepping at 12 frames a second | Tier 2 only |
| Vignette | 35% | |
| Shadows | Up to 28 px long, 14 px soft, pointing away from the light | They swing when the light moves |
| Dust motes | 24 near a ghost, 60 when it is released | Tier 2 only |

The overlay is a fixed layer with `pointer-events: none`. The "hole" is sized from the **measured** focus rectangle and updated on focus, scroll, resize and zoom.

---

## 3. Ghosts (living silhouettes)

- Drawn as **SVG shapes by Kiro** from the story bible's silhouette brief (Section 3 of the story bible, `story-bible.md`). No stock art. No AI image files in the repo.
- Each ghost is one silhouette about 20% to 28% of the screen height, with a 2 px rim light on the edge nearest the lamp.
- **Edges are alive** in code: slow turbulence (3 px, 0.4 times a second) and a mist of motes.
- **Four states:** idle; notice (turns toward you, 400 ms); plead (a 3.2 s loop of small gestures); release (1.6 s, the silhouette dissolves into motes that drift toward the lamp or the door).
- Never a jump scare, never a sudden movement towards the player, never loud.

---

## 4. Title cards and camera

- **Letterbox bars** (12% top and bottom) and a slow **push-in** (scale 1.00 to 1.04 over 2.2 s) on each chapter card.
- Card text fades in over 500 ms. The card shows for 2.2 s, then the rack-focus transition (a blur-to-sharp, 400 ms) opens the room. With reduced motion: a plain fade.
- Cards use the chapter's palette and the same type. The word on the card is the chapter's verb ("See and name").

---

## 5. Type

System fonts by default (no files, no licence questions). Title cards use a serif stack (Georgia, then Times New Roman, then the browser's serif). A bundled font is allowed only under the SIL Open Font License, with its licence text saved and listed in `ATTRIBUTION.md`.

---

## 6. The three tiers (all tested)

| Tier | What it has | When |
|---|---|---|
| **2 (full)** | Light, rack-focus blur, shadows, grain, motes | A capable browser and graphics |
| **1 (light)** | CSS light and vignette only; no blur | The blur is too slow, or the browser lacks it |
| **0 (plain)** | A plain, accessible page: no effects | Reduced motion, Lights On, or any error |

The game measures its own speed for two seconds and drops one tier if the median is below 40 frames a second.

---

## 7. Safety rules (the look-guard blocks a file that breaks them)

1. **Text contrast of at least 4.5 to 1** against its background in every look, tier and state.
2. **No flash above 3 per second.** Flicker and slow-motion curves are checked as data; rendered frames are checked by screenshot tests.
3. **Reduced motion** replaces all movement with fades and stills.
4. **Lights On** is always one keystroke away from Settings and the Menu.
5. The sound and the picture never depend on colour alone to carry meaning.

---

## 8. What a look file contains (data, not code)

One `looks/<chapter>.json` per chapter with: the chapter name; the palette (ink, light, accent, text); the light (radius, padding, blur, darkness); the grade (grain, vignette); the effect numbers from Section 2; the title-card settings; and the **sound set** name. A schema checks every file, and property tests check the rules in Section 7.

---

## 9. Do not

- No stock footage, no AI-generated pictures, no copied logos or fonts of other products.
- No effect that makes the focus ring harder to see.
- No parallax or movement that follows the pointer (the game is about the keyboard).
- No red-and-black flashing, ever.
