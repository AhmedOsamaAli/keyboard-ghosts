import { test, expect, type Page } from '@playwright/test';

type Box = { x: number; y: number; w: number; h: number };
const PAGE = 'spikes/rack-focus/index.html';
const FOCUSABLE = 'a[href], button, input';
const RING = 5; // 3px outline + 2px offset

async function open(page: Page, query = '?tier=2') {
  await page.goto(`${PAGE}${query}`);
  await page.waitForFunction(() => '__rack' in window);
}

/** Read the focused element's rect and the current hole in the same JS turn. */
async function sample(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const r = el.getBoundingClientRect();
    const hole = (window as unknown as { __rack: { hole: Box | null } }).__rack.hole;
    return {
      name: el.textContent?.trim() || el.getAttribute('name') || el.tagName,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      hole,
    };
  });
}

function missing(s: { name: string; rect: Box; hole: Box | null }, margin = 0): string | null {
  const h = s.hole;
  if (!h) return `${s.name}: no hole`;
  const r = s.rect;
  const ok =
    h.x <= r.x - margin + 0.5 &&
    h.y <= r.y - margin + 0.5 &&
    h.x + h.w >= r.x + r.w + margin - 0.5 &&
    h.y + h.h >= r.y + r.h + margin - 0.5;
  return ok ? null : `${s.name}: rect ${JSON.stringify(r)} not inside hole ${JSON.stringify(h)}`;
}

async function tabAll(page: Page, settleMs = 400) {
  const count = await page.locator(FOCUSABLE).count();
  const problems: string[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(settleMs);
    const s = await sample(page);
    const p = missing(s, RING);
    if (p) problems.push(`#${i} ${p}`);
  }
  return { count, problems };
}

test.describe('rack focus', () => {
  test('(a) Tab through the page: hole always contains the focused rect (incl. ring)', async ({
    page,
  }) => {
    await open(page);
    const { count, problems } = await tabAll(page);
    console.log(`RF(a) stops=${count} problems=${problems.length}`);
    expect(count).toBeGreaterThanOrEqual(30);
    expect(problems).toEqual([]);
  });

  test('(b) after scrolling, and while scrolling', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 1100));
    await page.waitForTimeout(300);
    const { problems } = await tabAll(page);
    expect(problems).toEqual([]);

    // follow while scrolling: focus a card, scroll in steps, sample after two frames each step
    await page.locator('.cards button').first().focus();
    await page.waitForTimeout(500);
    let lagMisses = 0;
    let steps = 0;
    for (const dy of [-40, -40, -40, 40, 40, 40, -120, 120]) {
      await page.mouse.wheel(0, dy);
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      const s = await sample(page);
      steps++;
      if (missing(s, RING)) lagMisses++;
    }
    await page.waitForTimeout(400);
    expect(missing(await sample(page), RING)).toBeNull();
    console.log(`RF(b) scroll-follow steps=${steps} transient misses=${lagMisses}`);
  });

  for (const zoom of [2, 4]) {
    test(`(c) ${zoom * 100}% zoom (emulated: viewport / ${zoom}, deviceScaleFactor ${zoom})`, async ({
      page,
    }) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: Math.round(1280 / zoom),
        height: Math.round(720 / zoom),
        deviceScaleFactor: zoom,
        mobile: false,
      });
      await open(page);
      const { problems } = await tabAll(page);
      console.log(`RF(c) zoom=${zoom * 100}% problems=${problems.length}`);
      expect(problems).toEqual([]);
    });
  }

  test('ring removed: drifts after 900 ms, snaps back in 320 ms', async ({ page }) => {
    await open(page);
    await page.locator('#ring-test').focus();
    await page.waitForTimeout(400);
    const opacity = (sel: string) =>
      page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).opacity, sel);
    expect(Number(await opacity('#rf .drift'))).toBe(0);
    await page.evaluate(() => document.getElementById('break-ring')?.click());
    await page.locator('#ring-test').focus(); // click moved focus to the readout button; return focus to the test button
    await page.waitForTimeout(1100);
    expect(
      await page.evaluate(
        () => (window as unknown as { __rack: { driftOn: boolean } }).__rack.driftOn,
      ),
    ).toBe(true);
    expect(Number(await opacity('#rf .drift'))).toBeGreaterThan(0.95);
    // restore the ring
    await page.evaluate(() => {
      const b = document.getElementById('ring-test') as HTMLElement;
      b.style.outline = '';
      b.style.boxShadow = '';
    });
    await page.waitForTimeout(450);
    expect(Number(await opacity('#rf .drift'))).toBeLessThan(0.05);
  });

  test('tiers: forced values and tier 0 has no overlay', async ({ page }) => {
    await open(page, '?tier=0');
    expect(
      await page.evaluate(() => getComputedStyle(document.getElementById('rf') as Element).display),
    ).toBe('none');
    await open(page, '?tier=1');
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('#rf .b1') as Element).backdropFilter,
      ),
    ).toBe('none');
    await open(page, '?tier=2');
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('#rf .b1') as Element).backdropFilter,
      ),
    ).toContain('blur(8.49px)');
  });

  // ---------- round 2 ----------
  const rack = (page: Page) =>
    page.evaluate(() => (window as unknown as { __rack: Record<string, unknown> }).__rack);

  test('settled: the lit core still contains the element and its ring (link, input, card; tier 2 and 1)', async ({
    page,
  }) => {
    for (const tier of [2, 1]) {
      await open(page, `?tier=${tier}`);
      for (const [sel, name] of [
        ['a[href="#a4"]', 'link'],
        ['input[name="city"]', 'input'],
        ['.cards button:nth-child(3)', 'card'],
      ] as const) {
        for (let i = 0; i < 40; i++) {
          if (await page.evaluate((s) => document.querySelector(s) === document.activeElement, sel))
            break;
          await page.keyboard.press('Tab');
        }
        await page.waitForTimeout(600);
        const s = await sample(page);
        // the core is the element plus 20 px, which is more than the 5 px ring
        expect(missing(s, 20), `tier ${tier} ${name}`).toBeNull();
      }
    }
  });

  test('keyboard focus ends in the middle third of the window (unless the page cannot scroll further)', async ({
    page,
  }) => {
    await open(page);
    const count = await page.locator(FOCUSABLE).count();
    const bad: string[] = [];
    let centred = 0;
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(450);
      const s = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const r = el.getBoundingClientRect();
        return {
          name: el.textContent?.trim() || el.getAttribute('name') || el.tagName,
          mid: r.top + r.height / 2,
          h: innerHeight,
          y: scrollY,
          max: document.documentElement.scrollHeight - innerHeight,
        };
      });
      const inMiddle = s.mid >= s.h / 3 - 1 && s.mid <= (2 * s.h) / 3 + 1;
      const atTop = s.y <= 0.5 && s.mid < s.h / 3;
      const atBottom = s.y >= s.max - 0.5 && s.mid > (2 * s.h) / 3;
      if (inMiddle) centred++;
      else if (!atTop && !atBottom)
        bad.push(
          `#${i} ${s.name}: centre ${s.mid.toFixed(0)} of ${s.h}, scrollY ${s.y.toFixed(0)}/${s.max}`,
        );
    }
    console.log(
      `RF(camera) stops=${count} in-middle-third=${centred} at-scroll-limit=${count - centred - bad.length} bad=${bad.length}`,
    );
    expect(bad).toEqual([]);
    expect(centred).toBeGreaterThan(count / 2);
  });

  test('mouse focus does not trigger the camera', async ({ page }) => {
    await open(page);
    await page.locator('.cards button').last().click();
    await page.waitForTimeout(500);
    const y1 = await page.evaluate(() => scrollY);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBe(y1);
  });

  test('the startup probe runs for real and its result is in the readout', async ({ page }) => {
    await open(page, ''); // no ?tier=, so the probe runs
    await page.waitForFunction(
      () =>
        (window as unknown as { __rack: { probe: { state: string } } }).__rack.probe.state ===
        'done',
      undefined,
      { timeout: 8000 },
    );
    await page.waitForTimeout(400);
    const text = await page.locator('#ro-probe').textContent();
    const p = (await rack(page))['probe'] as { median: number; p95: number; frames: number };
    console.log(`RF(probe) ${text} frames=${p.frames}`);
    expect(text).toMatch(/^probe: median [\d.]+ ms, p95 [\d.]+ ms, (kept|dropped to) tier \d$/);
    expect(p.frames).toBeGreaterThan(20); // 1.5 s of real frames
  });

  test('forced tier skips the probe', async ({ page }) => {
    await open(page, '?tier=2');
    await page.waitForTimeout(500);
    expect(await page.locator('#ro-probe').textContent()).toContain('skipped');
  });

  test('B: nothing is written to the page while the lit area does not move', async ({ page }) => {
    await open(page);
    await page.locator('#menu').focus();
    await page.waitForTimeout(800);
    const w1 = (await rack(page))['writes'];
    await page.waitForTimeout(700);
    expect((await rack(page))['writes']).toBe(w1);
  });

  test('prefers-reduced-motion forces tier 0', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '?tier=2');
    expect(
      await page.evaluate(() => (window as unknown as { __rack: { tier: number } }).__rack.tier),
    ).toBe(0);
  });

  for (const tier of [2, 1, 0]) {
    test(`(d) CPU x4 frame time, tier ${tier}`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page);
      await open(page, `?tier=${tier}`);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.locator(FOCUSABLE).nth(3).focus();
      // 3 s of load: scroll every frame and move focus every 400 ms, measuring rAF deltas in-page
      const result = await page.evaluate(
        () =>
          new Promise<{ median: number; p95: number; n: number }>((resolve) => {
            const els = Array.from(
              document.querySelectorAll<HTMLElement>('a[href], button, input'),
            );
            const dts: number[] = [];
            let last = 0;
            let dir = 1;
            const start = performance.now();
            let nextFocus = start + 400;
            let idx = 3;
            const step = (now: number) => {
              if (last) dts.push(now - last);
              last = now;
              const maxY = document.documentElement.scrollHeight - innerHeight;
              const y = scrollY + dir * 8;
              if (y > maxY || y < 0) dir = -dir;
              window.scrollBy(0, dir * 8);
              if (now > nextFocus) {
                idx = (idx + 1) % els.length;
                els[idx]?.focus({ preventScroll: true });
                nextFocus = now + 400;
              }
              if (now - start < 3000) requestAnimationFrame(step);
              else {
                const s = [...dts].sort((p, q) => p - q);
                resolve({
                  median: s[s.length >> 1] as number,
                  p95: s[Math.floor(s.length * 0.95)] as number,
                  n: s.length,
                });
              }
            };
            requestAnimationFrame(step);
          }),
      );
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log(
        `RF(d) tier=${tier} cpu=4x median=${result.median.toFixed(1)}ms p95=${result.p95.toFixed(1)}ms frames=${result.n}`,
      );
      expect(result.n).toBeGreaterThan(10);
    });
  }
});
