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

test('a readable refusal, moving companion, pause, and replay export', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?lab=1');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '1 Sevim', exact: true }).click();
  await page.evaluate(() => window.smoke.advance(90));
  await page.getByRole('button', { name: 'Come', exact: false }).click();
  await page.evaluate(() => window.smoke.advance(1));
  await expect(page.locator('#line')).toContainText(/books|pushing|bundle/);
  const refusal = await page.evaluate(() => window.smoke.getState().people[0]?.resolution?.verdict);
  expect(refusal).not.toBe('assented');
  await page.evaluate(() => window.smoke.advance(650));
  expect(await page.evaluate(() => window.smoke.getState().routeFound)).toBe(true);
  expect(
    await page.evaluate(() =>
      window.smoke
        .getState()
        .people.some((p) => p.status === 'safe' || p.status === 'following' || p.status === 'escaping'),
    ),
  ).toBe(true);
  const bounds = await page.locator('canvas').boundingBox();
  const controls = await page.locator('.actions').boundingBox();
  expect(bounds).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThan(controls!.y);
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('*')]
      .filter((e) => e.getBoundingClientRect().right > innerWidth)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        right: e.getBoundingClientRect().right,
        width: e.getBoundingClientRect().width,
      }))
      .slice(0, 12),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.getByRole('button', { name: 'Pause and open menu' }).click();
  const tick = await page.evaluate(() => window.smoke.getState().tick);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.smoke.getState().tick)).toBe(tick);
  await expect(page.getByRole('button', { name: "I'm stopping", exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: "I'm confused", exact: true })).toBeVisible();
  await page.getByRole('button', { name: "I'm confused", exact: true }).click();
  await expect(page.getByRole('dialog').last()).toBeVisible();
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
