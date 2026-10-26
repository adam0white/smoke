import { expect, test } from '@playwright/test';
import { coldPolicy } from '../src/cold-policy';
import type { Screen } from '../src/screen';
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

test('screen teaches an escort and exposes smoke timing in words', async ({ page }) => {
  await page.goto('/?lab=1&seed=1');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await expect(page.locator('#smoke-clock')).toContainText(/smoke.*in.*Stair closes in/);
  await expect(page.locator('#guidance')).toContainText('approach');
  await expect(page.getByRole('button', { name: 'Street', exact: true })).toBeVisible();
  await page.locator('[data-id="sevim"]').click();
  await page.evaluate(() => window.smoke.advance(110));
  await page.locator('[data-action="books"]').click();
  await page.evaluate(() => window.smoke.advance(100));
  await page.locator('[data-action="torch"]').click();
  await page.evaluate(() => window.smoke.advance(1));
  await page.locator('[data-action="route"]').click();
  await page.evaluate(() => window.smoke.advance(1));
  await page.locator('[data-action="together"]').click();
  await page.evaluate(() => window.smoke.advance(1));
  await expect(page.locator('[data-id="sevim"]')).toContainText('Following');
  await expect(page.locator('#guidance')).toContainText('Street');
  await page.getByRole('button', { name: 'Street', exact: true }).click();
  await page.evaluate(() => window.smoke.advance(300));
  await expect(page.locator('[data-id="sevim"]')).toContainText('Outside');
  const hashes = await page.evaluate(() => [window.smoke.replayCheck(), window.smoke.exportRun().hash]);
  expect(hashes[0]).toBe(hashes[1]);
});

test('cold policy wins using rendered text and enabled controls only', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/?lab=1&seed=4');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  for (let second = 0; second < 160; second++) {
    if (await page.getByRole('heading', { name: /Everyone is out|made it out with you/ }).isVisible()) break;
    const screen = (await page.evaluate(() => ({
      phase: 'playing',
      dialogue: document.querySelector('#line')!.textContent!,
      torch: document.querySelector('[data-action="torch"]')!.getAttribute('aria-pressed') === 'true',
      timer: document.querySelector('#smoke-clock')!.textContent!,
      guidance: document.querySelector('#guidance')!.textContent!,
      selected: (document.querySelector('.people .active') as HTMLElement).dataset.id!,
      people: Array.from(document.querySelectorAll<HTMLElement>('.people button')).map((button) => ({
        id: button.dataset.id!,
        name: button.querySelector('span')!.textContent!,
        status: button.querySelector('small')!.textContent!,
      })),
      available: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action]'))
        .filter((button) => !button.disabled && button.dataset.action !== 'torch')
        .map((button) => button.dataset.action!),
    }))) as Screen;
    const command = coldPolicy(screen);
    try {
      if (command?.type === 'select')
        await page.locator(`[data-id="${command.id}"]`).click({ timeout: 1000 });
      if (command?.type === 'street')
        await page.getByRole('button', { name: 'Street', exact: true }).click({ timeout: 1000 });
      if (command?.type === 'speech')
        await page.locator(`[data-action="${command.action}"]`).click({ timeout: 1000 });
    } catch (error) {
      // The real-time ticker can finish the run between observation and click.
      // Accept that outcome only when the actual outcome dialog is visible.
      if (await page.getByRole('heading', { name: /Everyone is out|made it out with you/ }).isVisible())
        break;
      throw error;
    }
    await page.evaluate(() => window.smoke.advance(20));
  }
  await expect(page.getByRole('heading', { name: 'Everyone is out.' })).toBeVisible();
  const hashes = await page.evaluate(() => [window.smoke.exportRun().hash, window.smoke.replayCheck()]);
  expect(hashes[0]).toBe(hashes[1]);
});
