import { createGame, exportRun, type Game, type LoggedInput, replayRun, stateHash, step } from './sim';
import type { Reply, Request, SimulationSnapshot } from './simulation';

let game: Game | undefined;
let replay: LoggedInput[] | undefined;
let replayIndex = 0;
const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<Request>) => void;
  postMessage: (reply: Reply) => void;
};
function current(): Game {
  if (!game) throw new Error('The simulation has not started.');
  return game;
}
function snapshot(previous?: SimulationSnapshot['previous']): SimulationSnapshot {
  const game = current();
  return {
    game,
    previous: previous ?? { people: game.people.map(({ x, y }) => ({ x, y })), player: { ...game.player } },
  };
}
scope.onmessage = ({ data }) => {
  try {
    let value: SimulationSnapshot | ReturnType<typeof exportRun> | string;
    switch (data.kind) {
      case 'reset': {
        const { seed, replay: source } = data.payload;
        if (source) {
          if (seed !== source.seed) throw new Error('Replay reset mismatch.');
          replayRun(source);
        }
        const next = createGame(seed);
        game = next;
        replay = source?.inputs;
        replayIndex = 0;
        value = snapshot();
        break;
      }
      case 'advance': {
        const game = current();
        const { ticks, inputs, held } = data.payload;
        if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 4000 || inputs.length > ticks)
          throw new Error('Invalid simulation batch.');
        let previous = snapshot().previous;
        for (let tick = 0; tick < ticks && game.phase === 'playing'; tick++) {
          previous = { people: game.people.map(({ x, y }) => ({ x, y })), player: { ...game.player } };
          const logged = replay?.[replayIndex];
          const input = replay
            ? logged?.tick === game.tick + 1
              ? replay![replayIndex++]!.input
              : undefined
            : (inputs[tick] ??
              (held.dx || held.dy
                ? { type: 'move' as const, x: game.player.x + held.dx * 30, y: game.player.y + held.dy * 85 }
                : undefined));
          step(game, input);
        }
        value = snapshot(previous);
        break;
      }
      case 'export':
        value = exportRun(current());
        break;
      case 'replayCheck':
        value = stateHash(replayRun(exportRun(current())));
        break;
    }
    scope.postMessage({ id: data.id, ok: true, value });
  } catch (error) {
    scope.postMessage({
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
