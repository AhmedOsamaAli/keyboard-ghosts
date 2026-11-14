import { expect, test, type Page } from '@playwright/test';
import { URLS, openPage } from './helpers';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// B6: sound is off until the player turns it on. These are automated Tab tests in Chrome.

interface Counts {
  contexts: number;
  starts: number;
  states: string[];
}

async function install(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __counts: { contexts: number; starts: number };
      __ctxs: BaseAudioContext[];
    };
    w.__counts = { contexts: 0, starts: 0 };
    w.__ctxs = [];
    const Real = window.AudioContext;
    class Counted extends Real {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.__counts.contexts++;
        w.__ctxs.push(this);
      }
    }
    window.AudioContext = Counted;
    const RealOffline = window.OfflineAudioContext;
    window.OfflineAudioContext = new Proxy(RealOffline, {
      construct(target, args) {
        w.__counts.contexts++;
        return Reflect.construct(target, args) as object;
      },
    });
    const start = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (...args: [number?]) {
      w.__counts.starts++;
      return start.apply(this, args);
    };
  });
}

async function counts(page: Page): Promise<Counts> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __counts: { contexts: number; starts: number };
      __ctxs: BaseAudioContext[];
    };
    return { ...w.__counts, states: w.__ctxs.map((c) => c.state) };
  });
}

test('B6 nothing exists or plays on load, hover or focus alone', async ({ page }) => {
  await install(page);
  await openPage(page);
  expect(await counts(page)).toEqual({ contexts: 0, starts: 0, states: [] });

  for (const name of ['Turn sound on', 'Break the light', 'Restore the light', 'Start beds']) {
    await page.getByRole('button', { name }).hover();
  }
  await page.getByRole('button', { name: 'Play tab-tick' }).hover();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  await page.getByLabel('Master level').focus();
  expect(await counts(page)).toEqual({ contexts: 0, starts: 0, states: [] });
});

test('B6 one click on "Turn sound on" makes exactly one running context; turning off suspends it', async ({
  page,
}) => {
  await install(page);
  await openPage(page);
  await page.getByRole('button', { name: 'Turn sound on' }).click();
  await expect(page.getByText('Sound is on.')).toBeVisible();
  let c = await counts(page);
  expect(c.contexts).toBe(1);
  expect(c.states).toEqual(['running']);

  await page.getByRole('button', { name: 'Play chapter-card' }).click();
  await page.getByRole('button', { name: 'Turn sound off' }).click();
  await expect(page.getByText('Sound is off.')).toBeVisible();
  c = await counts(page);
  expect(c.contexts).toBe(1);
  expect(c.states).toEqual(['suspended']);

  await page.getByRole('button', { name: 'Turn sound on' }).click();
  await expect(page.getByText('Sound is on.')).toBeVisible();
  c = await counts(page);
  expect(c.contexts).toBe(1);
  expect(c.states).toEqual(['running']);
});

test('B6 the engine makes no context before enable(), even when asked to play', async ({
  page,
}) => {
  await install(page);
  await openPage(page);
  const before = await counts(page);
  const after = await page.evaluate(async (url) => {
    const m = (await import(/* @vite-ignore */ url)) as typeof import('../../../src/audio/index');
    const audio = m.createAudio({ seed: 1 });
    audio.setChapter('chapel');
    audio.setFocusState('dim');
    audio.play('church-bell');
    audio.setMaster(0);
    const w = window as unknown as { __counts: { contexts: number; starts: number } };
    return { ...w.__counts, enabled: audio.state().enabled };
  }, URLS.audio);
  expect(before.contexts).toBe(0);
  expect(after).toEqual({ contexts: 0, starts: 0, enabled: false });
});
