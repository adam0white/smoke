import { expect, it } from 'vitest';
import { createGame, exportRun, type RunExport, replayRun, restoreGame, stateHash, step } from './sim';

it('round-trips new exports and rejects old formats and content corruption', () => {
  const g = createGame(7);
  step(g, { type: 'torch' });
  const current = exportRun(g);
  expect(current.format).toBe('smoke-8');
  expect(stateHash(replayRun(current))).toBe(current.hash);
  expect(exportRun(restoreGame(current))).toEqual(current);
  for (const invalid of [
    { ...current, format: 'smoke-7' },
    { ...current, format: 'smoke-6' },
    { ...current, seed: current.seed + 2 ** 32 },
    { ...current, inputs: [{ tick: 1, input: { type: 'move', x: 1, y: 2 } }] },
    { ...current, human: { ...current.human, active: { bogus: {} } } },
  ]) {
    expect(() => replayRun(invalid as RunExport)).toThrow();
    expect(() => restoreGame(invalid as RunExport)).toThrow();
  }
});

it('rejects an inflated top-level tick count after a real terminal state', () => {
  const game = createGame(7);
  for (let i = 0; i < 4000 && game.phase === 'playing'; i++) step(game);
  expect(game.phase).not.toBe('playing');
  const terminal = exportRun(game);
  expect(stateHash(replayRun(terminal))).toBe(terminal.hash);
  const inflated = { ...terminal, ticks: terminal.ticks + 1 };
  expect(() => replayRun(inflated)).toThrow();
  expect(() => restoreGame(inflated)).toThrow();
});
