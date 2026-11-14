# Sound review (spectrograms)

Pictures: `docs/evidence/sound/<voice>.png` and `room-<chapter>.png`, made by `node --experimental-strip-types tools/sound/render.ts`. Each picture has a log frequency axis from 30 Hz to 16 kHz and shows 80 dB of range, so quiet parts look larger than they sound. A picture shows shape. It cannot say whether a sound is convincing. That needs the owner's ears.

## Round 1 (Nov 14 2026)

Checked against brief §12:

| Check | Result |
|---|---|
| A bell shows separate decaying partial lines | Pass. `chime`, `church-bell`, `glass-ring`, `music-box`: separate lines, and the high partials end first. |
| The breath swells then thins | Pass in shape: noise swells for about 1 s, then a steady 300 Hz tone remains. Weak: the noise reached far outside 500 to 3,000 Hz. |
| Wind is a moving band, not a hiss | Weak. A drifting band near 500 Hz to 1 kHz was visible, but on a wide hiss from 50 Hz to 6 kHz. |
| Room tails look like smooth decays | Pass. Every `room-*` picture is a smooth fade, and the highs die first. The measured decay times are within 25% (0.47, 0.84, 3.00, 1.50, 0.65, 1.12, 1.87 s). |
| Creaks show a wandering pitch | Pass. `floor-creak` and `door-creak` show a harmonic stack that wanders, cut by stick-slip pulses. |
| Nothing is clipped | Pass. Every voice peaks at -3 dBFS at its own output (chains -4.5, tap -1.5). |

Changed: the breath got a second high-pass and low-pass stage. The wind and wind-gaps got a second band-pass that moves with the first. Their trims were measured again so they still peak at -3 dBFS.

## Round 2 (Nov 14 2026, last round)

| Item | Result |
|---|---|
| Breath | Better. The band below 200 Hz is gone. Some noise above 3 kHz is still visible at this range. |
| Wind | Better but still weak. The band and its top edge near 3 kHz are clear. Noise below 200 Hz is still visible. A high-pass at half the lowest centre was added this round and helped a little. |
| Wind-gaps | Pass. A moving band with two whistle lines near 1.25 and 1.7 kHz. |
| Bars | Pass. A rising scrape, then two clank lines (1.1 and 2.7 kHz). |
| Fire | Pass in shape: sparse crackles over a low rumble (crest factor 26.8 dB). |

B1, B2, B4 and B7 were run again after round 2: 64 passed.

## Still weak

- Wind: still partly a hiss. A recording (`wind`) would likely beat the code here.
- Creaks: the stick-slip pulses are hard-edged and may sound like clicks rather than wood.
- Fire: code-made crackle may sound like static. It is very low in the foyer mix (-37 dB).
- Murmur: formant noise can sound like a radio between stations.
- `floor-creak` and `door-creak` look the same at their defaults. Each chapter gives them different numbers.

## Needs the owner's ears

Everything above, and the whole mix in the lab: the light-dies beat of silence, the repair chime against the muffled world, and the bed loops (47 s and 61 s) for an audible join. Tune with `labs/sound/index.html?tune=1` and "Copy sound JSON".
