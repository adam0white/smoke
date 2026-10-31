import { expect, it } from 'vitest';
import { readScreen } from './screen';
import { canSpeak, createGame, step } from './sim';

it('allows Sevim to be shown the stair after Burak finishes their shared bundle', () => {
  const g = createGame(4);
  const sevim = g.people[0]!;
  const burak = g.people[1]!;

  // Seed 4 reaches Burak's real HF help action; keep that dependency active.
  for (let i = 0; i < 800 && burak.action !== 'help'; i++) step(g);
  expect(burak.action).toBe('help');
  expect(burak.hf.activity).toBeDefined();

  sevim.asleep = false;
  sevim.taskTicks = 0;
  Object.assign(g.player, { x: sevim.x, y: sevim.y, targetX: sevim.x, targetY: sevim.y });
  step(g, { type: 'torch' });
  step(g, { type: 'speak', id: 'sevim', line: 'books' });
  expect(sevim.action).toBe('books');
  expect(sevim.hf.activity).toBeDefined();
  expect(sevim.booksReady).toBe(false);

  // Sevim advances to 79 first; the nearby helper completes tick 80 in the same step.
  sevim.taskTicks = 78;
  Object.assign(burak, { x: sevim.x, y: sevim.y });
  step(g);
  expect(sevim.booksReady).toBe(true);
  expect(g.events.some((event) => event.text.includes('The bundle is tied.'))).toBe(true);

  // A completed bundle must not keep the speech gate and hint in the tying state.
  expect(canSpeak(g, 'sevim', 'route')).toBe(true);
  expect(readScreen(g, 'sevim').guidance).toContain('Show the stair');
  expect(readScreen(g, 'sevim').people[0]!.status).not.toContain('tying the books');
});

it('records the stair route input and changes the HF checkpoint', async () => {
  const { exportRun } = await import('./sim');
  const exercise = (send: boolean) => {
    const g = createGame(4);
    const sevim = g.people[0]!;
    const burak = g.people[1]!;
    for (let i = 0; i < 800 && burak.action !== 'help'; i++) step(g);
    expect(burak.action).toBe('help');
    sevim.asleep = false;
    sevim.taskTicks = 0;
    Object.assign(g.player, { x: sevim.x, y: sevim.y, targetX: sevim.x, targetY: sevim.y });
    step(g, { type: 'torch' });
    step(g, { type: 'speak', id: 'sevim', line: 'books' });
    expect(sevim.action).toBe('books');
    sevim.taskTicks = 78;
    Object.assign(burak, { x: sevim.x, y: sevim.y });
    step(g);
    expect(sevim.booksReady).toBe(true);
    step(g, send ? { type: 'speak', id: 'sevim', line: 'route' } : undefined);
    return { sevim, checkpoint: exportRun(g).human.archive.hashes.full };
  };
  const current = exercise(true);
  const currentControl = exercise(false);
  expect(current.sevim.routeKnown).toBe(true);
  expect(current.checkpoint).not.toBe(currentControl.checkpoint);
});

it('does not replace Sevim’s other states when the helper completes the bundle', () => {
  for (const [status, action] of [
    ['safe', 'follow'],
    ['following', 'follow'],
    ['dead', 'dead'],
    ['waiting', 'rest'],
  ] as const) {
    const g = createGame(4);
    const sevim = g.people[0]!;
    const burak = g.people[1]!;
    for (let i = 0; i < 800 && burak.action !== 'help'; i++) step(g);
    expect(burak.action).toBe('help');
    Object.assign(sevim, { status, action, taskTicks: 79, booksReady: false });
    Object.assign(burak, { x: sevim.x, y: sevim.y });
    expect(sevim.booksReady).toBe(false);
    step(g);
    expect(sevim.status).toBe(status);
    expect(sevim.action).toBe(action);
    if (status === 'dead') {
      expect(sevim.booksReady).toBe(false);
      expect(burak.action).not.toBe('help');
    } else {
      expect(sevim.booksReady).toBe(true);
      expect(sevim.taskTicks).toBe(80);
    }
  }
});
