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
