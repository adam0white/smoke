import { expect, test } from '@playwright/test';
import type { Game, Input, RunExport } from '../src/sim';

type Smoke = {
  getState: () => Game;
  enqueue: (input: Input) => void;
  advance: (ticks: number) => Game;
  exportRun: () => RunExport;
  frameTimes: () => number[];
  replayCheck: () => string;
};
declare global {
  interface Window {
    smoke: Smoke;
  }
}

test('speech is contextual, all events persist, and pause has navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/?lab=1&seed=1');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  // No neighbour is within speaking distance at the street.
  for (const action of ['come', 'books', 'together', 'route']) {
    await expect(page.locator(`[data-action="${action}"]`)).toBeDisabled();
  }
  const before = await page.evaluate(() => window.smoke.exportRun().inputs.length);
  await page.keyboard.press('e');
  await page.keyboard.press('b');
  await page.keyboard.press('t');
  await page.keyboard.press('r');
  await page.evaluate(() => window.smoke.advance(1));
  expect(await page.evaluate(() => window.smoke.exportRun().inputs.length)).toBe(before);
  const resident = await page.evaluate(() => window.smoke.getState().people.find((p) => p.atHome)!);
  await page.locator(`[data-id="${resident.id}"]`).click();
  await page.evaluate(() => window.smoke.advance(110));
  await expect(page.locator('[data-action="come"]')).toBeEnabled();
  await expect(page.locator('[data-action="together"]')).toBeEnabled();
  if (resident.id !== 'sevim') await expect(page.locator('[data-action="books"]')).toBeDisabled();
  await page.locator('[data-action="come"]').click();
  await page.evaluate(() => window.smoke.advance(1));
  await expect(page.locator('#line')).toContainText(/books|pushing|bundle/);
  expect(
    await page.evaluate(
      () => window.smoke.getState().people.find((p) => p.id === 'sevim')!.resolution?.verdict,
    ),
  ).not.toBe('assented');
  // Same-tick reports from different people must all render, regardless of selection.
  await page.evaluate(() => {
    const state = window.smoke.getState();
    state.events.push(
      { tick: state.tick, text: 'Burak: The stair is clear.' },
      { tick: state.tick, text: 'Derya reached the street.' },
      { tick: state.tick, text: 'Hacer: I can see the stair.' },
    );
    window.smoke.advance(1);
  });
  const feed = page.getByRole('log');
  await expect(feed).toContainText('Burak: The stair is clear.');
  await expect(feed).toContainText('Derya reached the street.');
  await expect(feed).toContainText('Hacer: I can see the stair.');
  const count = await feed.locator('li').count();
  await page.evaluate(() => window.smoke.advance(2));
  expect(await feed.locator('li').count()).toBeGreaterThanOrEqual(count);
  const canvas = await page.locator('canvas').boundingBox();
  const controls = await page.locator('.controls').boundingBox();
  expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(controls!.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole('button', { name: 'Pause and open menu' }).click();
  const tick = await page.evaluate(() => window.smoke.getState().tick);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.smoke.getState().tick)).toBe(tick);
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All games', exact: true })).toHaveAttribute(
    'href',
    'https://human.adamwhite.work/games/',
  );
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByText('Start a new night? This ends the current night.')).toBeVisible();
  expect(await page.evaluate(() => window.smoke.getState().tick)).toBe(tick);
  await page.getByRole('button', { name: 'Start new night', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(feed).not.toContainText('Derya reached the street.');
  expect(errors).toEqual([]);
});

test('keyboard climbs, export replays and a complete loss names the outcome', async ({ page }) => {
  await page.goto('/?lab=1');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowUp');
  expect(await page.evaluate(() => window.smoke.getState().player.targetY)).toBeLessThan(450);
  await page.evaluate(() => window.smoke.advance(3300));
  await expect(page.getByRole('heading', { name: /Everyone is out|made it out with you/ })).toBeVisible();
  await expect(page.getByText(/Nobody died/)).toBeVisible();
  const result = await page.evaluate(() => ({
    hash: window.smoke.exportRun().hash,
    replay: window.smoke.replayCheck(),
  }));
  expect(result.hash).toBe(result.replay);
});

test('WebGL loss pauses with a recovery and export', async ({ page }) => {
  await page.goto('/?lab=1');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByRole('heading', { name: 'The picture was interrupted.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download this run', exact: true })).toBeVisible();
});

test('Chromium frame CPU stays below16ms at fourfold slowdown', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium CPU slowdown measurement');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/?lab=1');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.waitForTimeout(2500);
  const times = await page.evaluate(() =>
    window.smoke
      .frameTimes()
      .slice(10)
      .sort((a, b) => a - b),
  );
  expect(times.length).toBeGreaterThan(30);
  const p95 = times[Math.floor(times.length * 0.95)]!;
  console.log(
    `4x CPU frame p95=${p95.toFixed(2)}ms max=${Math.max(...times).toFixed(2)}ms samples=${times.length}`,
  );
  expect(p95).toBeLessThan(16);
  await cdp.detach();
});
