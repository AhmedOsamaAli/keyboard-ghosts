# Rack focus: results (2026-11-13)

Local Google Chrome via Playwright (`channel: 'chrome'`), headless, 1280x720. Run: `npx playwright test rack-focus`.

| Check | Result |
| --- | --- |
| (a) Tab through all 30 focus stops, 400 ms after each stop: hole contains the rect plus the 5 px ring | pass, 0 misses |
| (b) after `scrollTo(0, 1100)`, tab through again | pass |
| (b) wheel-scrolling with a card focused, sampled 2 frames after each of 8 steps | pass, 0 transient misses (see caveat 3) |
| (c) 200% zoom (emulated) | pass |
| (c) 400% zoom (emulated) | pass |
| Ring removed (Break the ring): drift layer fully in at 900 ms, back out within 320 ms | pass |
| `?tier=0/1/2`, reduced motion forces tier 0 | pass |
| (d) CPU x4, 3 s of scrolling plus focus moves, median frame, tier 2 | 16.7 ms in 3 of 4 runs; 66.5 ms in the first run |
| (d) same, tier 1 | 16.7 ms in 3 of 4 runs; 33.5 ms in the first run |
| (d) same, tier 0 (no effect, reference) | 16.7 ms in 3 of 4 runs; 33.3 ms in the first run |
| (d) p95 frame, tier 2 / tier 1 / tier 0 (runs 2-4) | 33.4 / 33.4 / 16.9 ms |
| (d) p95 frame, first run, tier 2 / tier 1 / tier 0 | 200 / 267 / 33.5 ms |

## What failed, flickered or looked wrong

1. The frame numbers are not trustworthy. The first run gave 66.5 ms (tier 2) and 33.5 ms (tier 1), and even the no-effect tier 0 gave 33.3 ms. The three later runs gave 16.7 ms for all tiers. I think the first run overlapped with something else on this machine, but I did not prove it. Only the p95 shows a gap between tier 2/1 and tier 0 (33 ms against 17 ms): the effect drops about one frame in twenty.
2. CDP CPU throttling slows the main thread only. Blur and compositing run on the GPU, so 4x throttling probably under-reports the real cost of backdrop-filter on a weak machine. A real low-end device is needed for a real answer.
3. The hole is moved by main-thread `requestAnimationFrame`, while Chrome scrolls on the compositor. The sampling saw no lag, but it can only check what the main thread believes. A one-frame offset between hole and element during fast scrolling cannot be excluded, and I did not capture screenshots to look for it.
4. During the 260 ms glide the hole does not contain the element on purpose. A sample 45 ms after Tab showed the element outside the hole. Only the settled state is asserted.
5. The mask is a data-URL SVG that is rebuilt every frame while the hole moves. It works, but it is the likely cost driver. The p95 spikes are consistent with that, but I did not profile it.
6. Zoom is emulated (viewport divided by the zoom factor, device scale factor multiplied), not real browser zoom. It is the same CSS-pixel layout, but the browser zoom UI path was not tested.
7. The auto tier choice measures idle rAF time (the page is not doing anything for 2 s), so it hardly sees the cost of the effect. It would only drop a tier on a machine that is already slow. Not tested on a slow machine.
8. No visual check was done. The stacked near/far blur (6 px then about 10.4 px, to give about 12 px combined) and the hard edge of the hole were never looked at in a screenshot.
9. With nothing focused (page load, or after Escape on body) the overlay is hidden rather than drifting. I chose this so the page does not go dark on load. It is a deviation from a literal reading of "no visible ring".
10. The readout and its button sit above the overlay at the bottom right, so they can cover page content when scrolling.
11. The drift cross-fades opacity layers rather than animating the blur radius, so mid-fade the blur is not a true 0 to 14 px ramp.

# Round 2 (2026-11-13)

Files: `index.html` + `rack-focus.ts` (new), `round1.html` + `round1.ts` (round 1, frozen for comparison), `bench.ts` (frame-time runs, writes `bench-results.json`), `shots.ts` (screenshots, `shots/` and `shots/CAPTIONS.md`). Same machine and Chrome as round 1.

## What was built

- **A. Soft falloff.** Each layer is masked by 8 static CSS gradients around the lit core (4 edge bands, 4 corner radial gradients centred on the core corners), so alpha is a function of distance to the core rectangle. Core = focused element + 20 px. Darkness: 0 at the core edge, 55% by 20 px, 78% by 120 px (smoothstep both steps). Blur: 2 stacked `backdrop-filter` layers of 8.49 px (their sum is 12 px), with overlapping ramps from 0 to 70 px and 50 px to 120 px. Why this and not one feathered mask: one mask needs an image that changes size, which is the cost problem we are removing. Gradients positioned by variables are the only no-image way I found. Why 2 blur layers and not 3: a first pass with 3 layers (6.93 px each) was clearly slower in software rendering (median 66.6 ms against 33.4 ms for round 1; that raw file was overwritten by the final run, so only my notes back this up), and 2 layers is the same number of backdrop blurs as round 1. Cost: tier 1 and tier 2 darkness has a 20 px ramp *outside* the core instead of a step, which is the only way to get 55% "next to the light" without a hard edge.
- **B. Cheaper updates.** No data URL. `rack-focus.ts` writes four CSS variables (`--cx --cy --cw --ch`) on `#rf`, only when the whole-pixel core changed. A test checks the write counter does not move while the lit area is still. The core is snapped outward to whole CSS pixels so the mask regions share pixel borders (no seams at 100% DPR; fractional DPR was not checked).
- **C. Camera.** On keyboard focus (a `keydown` happened since the last `pointerdown`) and tier above 0, the page scrolls so the element centre goes to the window centre in 260 ms with an ease-out cubic, driven from the same rAF as the mask. I did not use `scrollIntoView({behavior:'smooth'})` because Chrome does not let you set its duration. Skipped when the element centre is already in the middle third, when `prefers-reduced-motion` is on (that already forces tier 0), and cancelled by wheel or touch. Tier 0 has no camera (it is the "nothing" reference).
- **D. Probe.** After `load`, 1.5 s: the lit area jumps over 6 evenly spread on-screen elements, one per 200 ms, frame times are recorded; median above 20 ms or p95 above 40 ms drops one tier. The result is in the readout (`probe:` line). `?tier=` skips it. Seen working: normal Chrome 3 of 3 kept tier 2 (median 16.7 ms); `--disable-gpu` 3 of 3 dropped to tier 1 (median 66.7 ms); CPU x4 3 of 3 dropped to tier 1 (see caveat 3).
- **E. Pictures.** 12 PNGs in `shots/`, captions in `shots/CAPTIONS.md`.

## Frame times

Script per run: 30 Tab presses 120 ms apart plus a wheel step (80 px, direction flips every 9 steps) every 100 ms, about 4 s, page 1280x720, a fresh page per run, in-page rAF deltas. Cells are **median / p95 / p99 in ms**, all 5 runs shown, nothing dropped. Order within a run is tier 2, 1, 0 and round 1 then round 2, so drift in machine load hits both versions about equally. Frames are quantised to 16.7 ms steps (60 Hz). Tier 0 is the control: its p95/p99 spikes show how much noise the machine adds by itself.

### normal

| tier | version | run 1 | run 2 | run 3 | run 4 | run 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | round 1 | 16.7 / 16.9 / 34.4 | 16.7 / 16.9 / 33.1 | 16.7 / 17.0 / 33.3 | 16.7 / 16.9 / 33.2 | 16.7 / 16.9 / 17.0 |
| 2 | round 2 | 16.7 / 17.3 / 50.3 | 16.7 / 16.9 / 17.8 | 16.7 / 16.9 / 17.0 | 16.7 / 16.9 / 17.0 | 16.7 / 16.9 / 17.0 |
| 1 | round 1 | 16.7 / 33.7 / 133.3 | 16.7 / 33.3 / 33.5 | 16.7 / 17.0 / 33.4 | 16.7 / 17.8 / 33.4 | 16.7 / 33.0 / 33.4 |
| 1 | round 2 | 16.7 / 17.2 / 150.0 | 16.7 / 16.9 / 17.1 | 16.7 / 16.9 / 17.1 | 16.7 / 16.8 / 17.0 | 16.7 / 16.9 / 17.0 |
| 0 | round 1 | 16.7 / 16.9 / 17.6 | 16.7 / 16.9 / 17.0 | 16.7 / 16.8 / 16.9 | 16.7 / 16.9 / 17.0 | 16.7 / 16.9 / 17.2 |
| 0 | round 2 | 16.7 / 16.9 / 17.1 | 16.7 / 16.9 / 17.0 | 16.7 / 16.9 / 17.1 | 16.7 / 16.9 / 17.0 | 16.7 / 17.1 / 17.2 |

### no-gpu, first pass (machine was busy: runs 1-3 are slow even for tier 1 control noise)

| tier | version | run 1 | run 2 | run 3 | run 4 | run 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | round 1 | 233.2 / 416.7 / 516.6 | 250.0 / 516.6 / 19299.2 | 250.0 / 433.4 / 500.0 | 66.7 / 183.3 / 783.2 | 50.0 / 116.6 / 133.3 |
| 2 | round 2 | 233.4 / 300.0 / 450.0 | 250.0 / 666.6 / 8249.7 | 250.0 / 533.4 / 10566.3 | 66.7 / 116.6 / 116.7 | 50.0 / 83.4 / 116.7 |
| 1 | round 1 | 16.7 / 33.4 / 50.1 | 16.7 / 83.3 / 100.1 | 16.7 / 50.0 / 66.6 | 16.7 / 33.3 / 33.4 | 16.7 / 33.3 / 83.3 |
| 1 | round 2 | 16.7 / 50.0 / 83.3 | 16.7 / 66.7 / 100.0 | 16.7 / 66.7 / 116.6 | 16.7 / 16.8 / 33.3 | 16.7 / 16.8 / 50.0 |
| 0 | round 1 | 16.7 / 16.8 / 50.1 | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.7 / 33.3 | 16.7 / 16.8 / 16.8 |
| 0 | round 2 | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 116.6 |

### cpu-x4

| tier | version | run 1 | run 2 | run 3 | run 4 | run 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | round 1 | 16.8 / 166.8 / 283.1 | 33.3 / 266.5 / 383.2 | 33.0 / 233.3 / 333.4 | 33.2 / 266.8 / 417.0 | 33.2 / 183.3 / 316.5 |
| 2 | round 2 | 16.8 / 83.6 / 266.6 | 33.2 / 133.4 / 233.3 | 16.7 / 183.3 / 300.0 | 16.8 / 166.8 / 250.0 | 16.7 / 150.1 / 216.6 |
| 1 | round 1 | 16.8 / 166.4 / 233.4 | 33.6 / 233.2 / 350.0 | 33.3 / 216.4 / 383.4 | 33.4 / 283.2 / 399.9 | 33.4 / 216.7 / 416.6 |
| 1 | round 2 | 16.8 / 100.1 / 150.0 | 16.9 / 150.0 / 233.1 | 16.8 / 133.5 / 250.0 | 16.8 / 166.5 / 216.6 | 16.8 / 166.5 / 216.8 |
| 0 | round 1 | 16.7 / 66.8 / 100.0 | 16.7 / 66.8 / 116.8 | 16.7 / 83.4 / 166.6 | 16.7 / 66.6 / 100.0 | 16.7 / 83.4 / 133.3 |
| 0 | round 2 | 16.7 / 66.5 / 133.4 | 16.7 / 66.6 / 133.2 | 16.7 / 33.4 / 166.6 | 16.7 / 83.4 / 150.0 | 16.7 / 50.0 / 116.8 |

### no-gpu, first pass (machine was busy: runs 1-3 are slow even for tier 1 control noise), second pass (same code, run after the first pass)

| tier | version | run 1 | run 2 | run 3 | run 4 | run 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | round 1 | 66.6 / 100.0 / 133.4 | 66.7 / 116.7 / 116.7 | 83.3 / 149.9 / 266.6 | 66.6 / 116.6 / 133.4 | 233.3 / 333.2 / 499.9 |
| 2 | round 2 | 66.6 / 116.7 / 133.4 | 66.6 / 100.0 / 133.3 | 66.7 / 133.3 / 133.4 | 66.6 / 133.3 / 233.3 | 233.3 / 283.3 / 466.7 |
| 1 | round 1 | 16.7 / 33.3 / 33.4 | 16.7 / 16.8 / 33.4 | 16.7 / 33.3 / 33.4 | 16.7 / 33.4 / 50.1 | 16.7 / 33.4 / 33.4 |
| 1 | round 2 | 16.7 / 16.8 / 33.3 | 16.7 / 16.8 / 33.3 | 16.7 / 16.8 / 33.3 | 16.7 / 50.0 / 66.7 | 16.7 / 50.0 / 50.1 |
| 0 | round 1 | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 166.7 | 16.7 / 16.8 / 16.8 |
| 0 | round 2 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 33.3 | 16.7 / 16.8 / 33.4 |

## Conclusions

**What improved**

- The look. In the screenshots I could open (below) the stacked-box edges are gone and the neighbours of the focused item are readable. Camera works: in the Tab test 27 of 30 stops ended in the middle third and the other 3 were at the scroll limit (page top).
- Normal Chrome and CPU x4: round 2 tier 1 is better than round 1 tier 1 in the tail (CPU x4 median 16.8-16.9 ms in 5 of 5 runs against 16.8 / 33.6 / 33.3 / 33.4 / 33.4 for round 1; normal Chrome p95 at most 17.2 ms in 5 of 5 runs against about 33 ms in 4 of 5 for round 1). Round 2 tier 2 under CPU x4 had median 16.7-16.8 ms in 4 of 5 runs against 33 ms in 4 of 5 for round 1. This is the best evidence that the per-frame data URL was a real cost.
- The probe separates the three conditions cleanly in 9 of 9 probe runs.

**What did not improve**

- Software rendering tier 2: no difference I can claim. Second pass medians were 66.6-83.3 ms for both versions in 4 of 5 runs (233 ms for both in the fifth); p95 was 100-150 ms for both in those 4 runs. The blur itself is the cost there, and I kept the same number of blur layers.
- Software rendering tier 1: mixed. Second pass p95: round 1 33.3 / 16.8 / 33.3 / 33.4 / 33.4, round 2 16.8 / 16.8 / 16.8 / 50.0 / 50.0 ms, so round 2 was better in 3 runs and worse in 2. 8 gradients per layer are not free in software. Noise is too high to call it a regression.
- The first no-gpu pass was spoiled by machine load (medians of 233-250 ms for both versions in runs 1-3, and the tier 0 control had a 116 ms p99 spike), which is why a second pass was run. Both are shown.
- CPU x4 tier 0 control still had p95 of 33-83 ms, so under throttling the p95/p99 columns are partly the machine, not the effect.

**What is still unproven**

1. Whether "normal Chrome" here uses a real GPU. Headless Chrome may already rasterise in software; I did not read `chrome://gpu`. So the "normal" table may not represent a user with a GPU, and `--disable-gpu` may be only a slower software path than the default.
2. rAF deltas measure main-thread frame production, not what reaches the screen. Compositor-side drops are not seen.
3. The probe on a throttled machine includes start-up work (module load, first style recalculation) in its 1.5 s, so under CPU x4 it can fail because of load and not because of the effect (probe median 133 and 142 ms in two runs; in the third the median was 16.8 ms but p95 was 200 ms). It never wrongly dropped a tier on normal Chrome here (3 runs); a slow page load on a good GPU could do so.
4. Seams or banding at fractional device pixel ratios, and in real browser zoom (zoom was emulated, as in round 1).
5. Tab and wheel interplay in real use: wheel cancels the camera, so users who scroll while tabbing never see the glide to centre.
6. The camera is hand-driven by `scrollTo` per frame, not compositor smooth scrolling, so it can stutter if the main thread is busy; not measured separately.

**Screenshots** (I could open and view `link-tier2-before`, `link-tier2-after`, `card-tier2-after` and `input-tier1-after`; I did not open the other 8 individually, so nothing is claimed about them).

- Round 1 link: the lit area is a visible rounded box with a big rounded blob around it, the problem you reported.
- Round 2 link, tier 2: the focused link is at about y=371 of 720, Charlie and Echo are readable, Bravo and Foxtrot are dim, the box edges are gone. Items two or more rows away and the right-hand column are almost black.
- Round 2 card, tier 2: Card 3 at the vertical centre; the cards next to it are dim. A faint lighter rectangle can still be seen around the card where the 20 px ramp begins, and the neighbour cards show a sharp cut where the core overlaps them (they are physically inside the lit core). The far cards are nearly invisible.
- Round 2 input, tier 1: City input at the centre, the other fields still readable but dim, a very faint rectangular halo about 20 px beyond the core. No hard edges.
- What looks wrong: because the page background is already near black, 78% darkness makes everything beyond about 100 px effectively unreadable, so "neighbours readable" is only true for the nearest ones. The readout box sits on top of the page in every shot.

**Which tier I would ship by default**

Auto tier with the probe, starting at tier 2 and falling back to tier 1, with tier 0 for reduced motion. Reasons: tier 2 is clearly better looking but is the one that collapses (66 ms medians) without GPU blur, and the probe caught that in 3 of 3 software runs; tier 1 was fine in every condition I measured (median 16.7 ms in every run except the busy first software pass). If the probe cannot be trusted on slow page loads (unproven item 3), ship tier 1 as the fixed default and make tier 2 opt-in.

