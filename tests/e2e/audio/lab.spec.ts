import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

// Offline renders are heavy. A generous limit stops a busy machine from failing the run; it is
// not an assertion about speed (docs/decisions.md, D4).
test.describe.configure({ timeout: 180_000 });

// The sound lab: keyboard use, visible focus, captions, the light buttons, the tuning drawer and axe.
// These are automated Tab tests in Chrome. They cannot judge how the lab sounds.
const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const LAB = 'labs/sound/index.html';

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run(): Promise<{ violations: { id: string; nodes: unknown[] }[] }> };
      }
    ).axe;
    const result = await axe.run();
    return result.violations.map((v) => `${v.id} (${v.nodes.length})`);
  });
}

async function focusedInfo(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      key: el.id || el.textContent?.trim() || el.tagName,
      outline: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
    };
  });
}

test('lab: the skip link moves focus to the main content', async ({ page }) => {
  await page.goto(LAB);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to the lab' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Turn sound on' })).toBeFocused();
});

test('lab: Tab reaches every control with a visible focus style and no trap', async ({ page }) => {
  await page.goto(LAB);
  const total = await page.evaluate(
    () => document.querySelectorAll('a[href], button, input, select, summary, textarea').length,
  );
  const seen = new Set<string>();
  for (let i = 0; i < total + 3; i++) {
    await page.keyboard.press('Tab');
    const info = await focusedInfo(page);
    if (!info) continue;
    expect(info.outline, info.key).not.toBe('none');
    expect(info.width, info.key).toBeGreaterThanOrEqual(2);
    seen.add(info.key);
  }
  expect(seen.size).toBeGreaterThanOrEqual(total);
  // Shift+Tab walks back out: focus is not trapped.
  for (let i = 0; i < total + 3; i++) await page.keyboard.press('Shift+Tab');
  const back = await focusedInfo(page);
  expect(back?.key ?? 'outside').not.toBe('Turn sound off');
});

test('lab: Play shows the caption, and Break and Restore change the light', async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole('button', { name: 'Turn sound on' }).click();
  await expect(page.getByText('Sound is on.')).toBeVisible();
  await page.getByRole('button', { name: 'Play chapter-card' }).click();
  await expect(page.locator('#caption')).toHaveText('[a soft chord swells]');
  await page.getByRole('button', { name: 'Break the light' }).click();
  await expect(page.locator('#focus-state')).toHaveText('Light: dim');
  await page.getByRole('button', { name: 'Restore the light' }).click();
  await expect(page.locator('#focus-state')).toHaveText('Light: lit');
  await page.getByLabel('Chapter', { exact: true }).selectOption('chapel');
  await page.getByRole('button', { name: 'Start beds' }).click();
  await expect(page.locator('#beds-state')).toContainText('room-tone');
  await page.getByRole('button', { name: 'Stop beds' }).click();
  await expect(page.locator('#beds-state')).toHaveText('No beds are playing.');
});

test('lab: the tuning drawer appears only with ?tune=1', async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole('button', { name: 'Copy sound JSON' })).toHaveCount(0);
  await page.goto(`${LAB}?tune=1`);
  await expect(page.getByRole('button', { name: 'Copy sound JSON' })).toBeVisible();
  await page.getByText('chime', { exact: true }).click();
  const slider = page.getByLabel('fundamentalHz').first();
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  const stored = await page.evaluate(() => sessionStorage.getItem('kg-sound-tune'));
  expect(stored).toContain('fundamentalHz');
});

test('lab: axe finds no violations, with and without the drawer', async ({ page }) => {
  await page.goto(LAB);
  expect(await axeViolations(page)).toEqual([]);
  await page.goto(`${LAB}?tune=1`);
  await page.getByText('chime', { exact: true }).click();
  expect(await axeViolations(page)).toEqual([]);
});
