import { expect, it, vi } from 'vitest';
import * as hf4 from './hf4';
import { createGame, exportRun, step } from './sim';

it('publishes neither world changes nor HF changes when an outcome receipt is rejected', () => {
  const original = hf4.createHumanRun;
  let reject = false;
  const spy = vi
    .spyOn(hf4, 'createHumanRun')
    .mockImplementation((seed, actual, saved) =>
      original(
        seed,
        (action) =>
          reject ? { psychological: { safety: 2 }, exposures: [], observedProgress: [] } : actual!(action),
        saved,
      ),
    );
  try {
    const game = createGame(7);
    step(game); // An ordinary resident starts a real HF activity.
    reject = true;
    let rejected = false;
    for (let tick = 0; tick < 200; tick++) {
      const before = exportRun(game);
      try {
        step(game);
      } catch {
        rejected = true;
        expect(exportRun(game)).toEqual(before);
        reject = false;
        step(game); // The same world tick succeeds with a valid outcome.
        break;
      }
    }
    expect(rejected).toBe(true);
  } finally {
    spy.mockRestore();
  }
});
