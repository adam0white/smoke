import { expect, test } from '@playwright/test';
import { coldPolicy } from '../src/cold-policy';
import type { Screen } from '../src/screen';
import { exportRun, type Game, type Input, type RunExport, replayRun } from '../src/sim';

type Smoke = {
  getState: () => Game;
  enqueue: (input: Input) => void;
  advance: (ticks: number) => Promise<Game>;
  exportRun: () => Promise<RunExport>;
  frameTimes: () => number[];
  frameCosts: () => { simulation: number; drawing: number; rendering: number }[];
  replayCheck: () => Promise<string>;
  workerMetrics: () => {
    queuedRequests: number;
    latencySamples: number[];
    backlogTicks: number;
    simulationError?: string;
  };
};
declare global {
  interface Window {
    smoke: Smoke;
  }
}

test('speech is contextual, all events persist, and pause has navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/?seed=1');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  // No neighbour is within speaking distance at the street.
  for (const action of ['come', 'books', 'together', 'route']) {
    await expect(page.locator(`[data-action="${action}"]`)).toBeDisabled();
  }
  const before = await page.evaluate(async () => (await window.smoke.exportRun()).inputs.length);
  await page.keyboard.press('e');
  await page.keyboard.press('b');
  await page.keyboard.press('t');
  await page.keyboard.press('r');
  await page.evaluate(() => window.smoke.advance(1));
  expect(await page.evaluate(async () => (await window.smoke.exportRun()).inputs.length)).toBe(before);
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
  // Check the real run through the public diagnostics.
  await page.getByRole('button', { name: 'Pause and open menu' }).click();
  const debug = page.locator('details').filter({ hasText: 'Debug' });
  await expect(debug).not.toHaveAttribute('open');
  await debug.locator('summary').click();
  await page.getByRole('button', { name: 'Check replay', exact: true }).click();
  await expect(page.locator('#debug-result')).toContainText('Replay matches:');
  await page.getByRole('button', { name: 'Keep going', exact: true }).click();
  const feed = page.getByRole('log');
  await expect(feed.locator('li').first()).toBeVisible();
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
  expect(await page.evaluate(() => window.smoke.getState().tick)).toBeLessThan(tick);
  expect(errors).toEqual([]);
});

test('keyboard climbs, export replays and a complete loss names the outcome', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/?seed=4');
  await expect(page.getByText('People left inside may die.')).toBeVisible();
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowUp');
  expect(await page.evaluate(() => window.smoke.getState().player.targetY)).toBeLessThan(450);
  await page.evaluate(() => window.smoke.advance(3300));
  await expect(page.getByRole('heading', { name: /Everyone is out|walked out with you/ })).toBeVisible();
  const people = await page.evaluate(() =>
    window.smoke
      .getState()
      .people.filter((p) => p.atHome)
      .map((p) => ({ name: p.name, status: p.status, exitMethod: p.exitMethod })),
  );
  expect(people.some((p) => p.status === 'dead')).toBe(true);
  for (const person of people) {
    const line = page.getByRole('dialog').getByRole('listitem').filter({ hasText: person.name });
    await expect(line).toHaveCount(1);
    await expect(line).toContainText(
      person.status === 'dead'
        ? 'died from smoke'
        : person.status === 'hospital'
          ? 'hospital'
          : person.exitMethod === 'alone'
            ? 'escaped alone'
            : 'walked out with you',
    );
  }
  await expect(page.getByRole('dialog')).not.toContainText(/Nobody died|made it out with you/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const result = await page.evaluate(async () => ({
    hash: (await window.smoke.exportRun()).hash,
    replay: await window.smoke.replayCheck(),
  }));
  expect(result.hash).toBe(result.replay);
  const original = await page.evaluate(() => window.smoke.exportRun());
  await page.getByRole('button', { name: 'Watch this run', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.evaluate(() => window.smoke.advance(3300));
  await expect(page.getByRole('heading', { name: /Everyone is out|walked out with you/ })).toBeVisible();
  const watched = await page.evaluate(() => window.smoke.exportRun());
  expect(JSON.stringify(watched) === JSON.stringify(original), 'complete watched export').toBe(true);
});

test('WebGL loss pauses with a recovery and export', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByRole('heading', { name: 'The picture was interrupted.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download this run', exact: true })).toBeVisible();
});

test('Chromium frame CPU stays below16ms at fourfold slowdown', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium CPU slowdown measurement');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Match the profiled workload: seed 4 has all four residents at home.
  await page.goto('/?seed=4');
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
  const costs = await page.evaluate(() => window.smoke.frameCosts().slice(10));
  const parts = Object.fromEntries(
    (['simulation', 'drawing', 'rendering'] as const).map((key) => {
      const values = costs.map((cost) => cost[key]).sort((a, b) => a - b);
      return [key, { p95: values[Math.floor(values.length * 0.95)], max: values.at(-1) }];
    }),
  );
  console.log(`4x CPU parts ${JSON.stringify(parts)}`);
  const progress = await page.evaluate(() => ({
    tick: window.smoke.getState().tick,
    worker: window.smoke.workerMetrics(),
  }));
  const latency = [...progress.worker.latencySamples].sort((a, b) => a - b);
  console.log(
    `4x CPU worker tick=${progress.tick} backlog=${progress.worker.backlogTicks} queued=${progress.worker.queuedRequests} latency p95=${latency[Math.floor(latency.length * 0.95)]?.toFixed(2)}ms max=${latency.at(-1)?.toFixed(2)}ms`,
  );
  expect(progress.worker.simulationError).toBeUndefined();
  expect(progress.tick).toBeGreaterThanOrEqual(35);
  expect(progress.worker.backlogTicks).toBeLessThan(10);
  expect(progress.worker.queuedRequests).toBeLessThanOrEqual(2);
  expect(p95).toBeLessThan(16);
  await cdp.detach();
});

test('screen teaches an escort and exposes smoke timing in words', async ({ page }) => {
  await page.goto('/?seed=1');
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
  await page.getByRole('button', { name: 'Pause and open menu' }).click();
  await expect(page.getByRole('heading', { name: 'Paused.', exact: true })).toBeVisible();
  const hashes = await page.evaluate(async () => [
    await window.smoke.replayCheck(),
    (await window.smoke.exportRun()).hash,
  ]);
  expect(hashes[0]).toBe(hashes[1]);
});

for (const leaveDerya of [false, true]) {
  test(
    leaveDerya
      ? 'leaving Derya names the cost and separates solo escape'
      : 'cold policy wins using rendered text and enabled controls only',
    async ({ page }) => {
      test.setTimeout(60000);
      await page.goto('/?seed=4');
      await page.getByRole('button', { name: 'Enter the stairwell' }).click();
      for (let second = 0; second < 160; second++) {
        if (await page.getByRole('heading', { name: /Everyone is out|walked out with you/ }).isVisible())
          break;
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
        if (leaveDerya) {
          screen.people = screen.people.filter((p) => p.id !== 'derya');
          // Once all intended rescues are visibly outside, there are no more inputs.
          // Advance the abandoned resident's remaining night in one call instead
          // of polling the same DOM once per simulated second on slow CI browsers.
          if (screen.people.every((p) => p.status === 'Outside' || p.status === 'Away tonight')) {
            await page.evaluate(() => window.smoke.advance(3300));
            break;
          }
        }
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
          if (await page.getByRole('heading', { name: /Everyone is out|walked out with you/ }).isVisible())
            break;
          throw error;
        }
        await page.evaluate(() => window.smoke.advance(20));
      }
      if (leaveDerya) {
        await expect(page.getByRole('heading', { name: '2 walked out with you.' })).toBeVisible();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Sevim walked out with you.');
        await expect(dialog).toContainText('Hacer walked out with you.');
        await expect(dialog).toContainText('Burak escaped alone.');
        await expect(dialog).toContainText('Derya was left inside');
        await expect(dialog).toContainText(/Derya.*(?:died from smoke|hospital)/);
        if (process.env.SMOKE_SCREENSHOT_DIR && test.info().project.name.startsWith('chromium-'))
          await page.screenshot({
            path: `${process.env.SMOKE_SCREENSHOT_DIR}/${test.info().project.name === 'chromium-phone' ? 'phone' : 'wide'}.png`,
          });
      } else {
        await expect(page.getByRole('heading', { name: 'Everyone is out.' })).toBeVisible();
      }
      const hashes = await page.evaluate(async () => [
        (await window.smoke.exportRun()).hash,
        await window.smoke.replayCheck(),
      ]);
      expect(hashes[0]).toBe(hashes[1]);
    },
  );
}

test('worker batches export the exact direct-core replay and reset starts fresh', async ({ page }) => {
  await page.goto('/?seed=4');
  await expect(page.getByRole('button', { name: 'Enter the stairwell' })).toBeVisible();
  // Leave the welcome dialog open: manual ticks have no wall-clock ticks mixed in.
  await page.evaluate(async () => {
    window.smoke.enqueue({ type: 'move', x: 70, y: 365 });
    await window.smoke.advance(110);
    window.smoke.enqueue({ type: 'torch' });
    await window.smoke.advance(1);
    await window.smoke.advance(30);
  });
  const run = await page.evaluate(() => window.smoke.exportRun());
  expect(run.ticks).toBe(141);
  expect(exportRun(replayRun(run))).toEqual(run);
  const concurrent = await page.evaluate(async () => {
    const advancing = window.smoke.advance(20);
    const exporting = window.smoke.exportRun();
    await advancing;
    return exporting;
  });
  expect(concurrent.ticks).toBe(161);
  expect(exportRun(replayRun(concurrent))).toEqual(concurrent);
  await page.getByRole('button', { name: 'Enter the stairwell' }).click();
  await page.getByRole('button', { name: 'Pause and open menu' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: 'Start new night', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const fresh = await page.evaluate(() => window.smoke.exportRun());
  expect(fresh.ticks).toBeLessThan(20);
  expect(exportRun(replayRun(fresh))).toEqual(fresh);
});
