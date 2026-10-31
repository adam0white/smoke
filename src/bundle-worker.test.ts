import { expect, it } from 'vitest';
import { createGame, exportRun, type RunExport, step } from './sim';
import { type Commands, type Reply, type Request, resetPayload } from './simulation';

it('validates the full playback export before worker reset and replays the current format', async () => {
  const scope = globalThis as unknown as {
    onmessage: (event: { data: Request }) => void;
    postMessage: (value: Reply) => void;
  };
  const previous = { onmessage: scope.onmessage, postMessage: scope.postMessage };
  let result: Reply;
  scope.postMessage = (value) => {
    result = value;
  };
  try {
    await import('./sim-worker');
    let id = 0;
    const call = <K extends keyof Commands>(request: { kind: K; payload: Commands[K] }) => {
      scope.onmessage({ data: { ...request, id: ++id } as Request });
      return result!;
    };
    expect(call({ kind: 'reset', payload: { seed: 7 } }).ok).toBe(true);
    expect(
      call({ kind: 'advance', payload: { ticks: 4, inputs: [{ type: 'torch' }], held: { dx: 0, dy: 0 } } })
        .ok,
    ).toBe(true);
    const fresh = call({ kind: 'export', payload: {} });
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    const current = fresh.value as RunExport;
    expect(current.format).toBe('smoke-8');
    expect(call({ kind: 'reset', payload: resetPayload(current.seed, current) }).ok).toBe(true);
    expect(
      call({ kind: 'advance', payload: { ticks: current.ticks, inputs: [], held: { dx: 0, dy: 0 } } }).ok,
    ).toBe(true);
    const freshAgain = call({ kind: 'export', payload: {} });
    expect(freshAgain.ok && freshAgain.value).toEqual(current);
    for (const bad of [
      { ...current, format: 'smoke-7' },
      { ...current, format: 'smoke-6' },
      { ...current, seed: current.seed + 2 ** 32 },
      { ...current, inputs: [] },
      { ...current, human: { ...current.human, active: { bogus: {} } } },
    ]) {
      expect(call({ kind: 'reset', payload: resetPayload(bad.seed, bad as RunExport) }).ok).toBe(false);
      const unchanged = call({ kind: 'export', payload: {} });
      expect(unchanged.ok && unchanged.value).toEqual(current);
    }
    const terminalGame = createGame(7);
    for (let i = 0; i < 4000 && terminalGame.phase === 'playing'; i++) step(terminalGame);
    expect(terminalGame.phase).not.toBe('playing');
    const terminal = exportRun(terminalGame);
    const inflated = { ...terminal, ticks: terminal.ticks + 1 };
    expect(call({ kind: 'reset', payload: resetPayload(inflated.seed, inflated) }).ok).toBe(false);
    const afterTerminalRejection = call({ kind: 'export', payload: {} });
    expect(afterTerminalRejection.ok && afterTerminalRejection.value).toEqual(current);
  } finally {
    scope.onmessage = previous.onmessage;
    scope.postMessage = previous.postMessage;
  }
});
