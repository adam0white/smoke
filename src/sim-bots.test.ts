import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame, exportRun, type Game, replayRun, stateHash, step } from './sim';

function advance(g: Game, n: number) {
  for (let i = 0; i < n; i++) step(g);
}
function travel(g: Game, x: number, y: number) {
  step(g, { type: 'move', x, y });
  for (let i = 0; i < 1000 && g.phase === 'playing' && (g.player.x !== x || g.player.y !== y); i++) step(g);
}
function bot(seed: number, strategy: 'silent' | 'careless' | 'competent') {
  const g = createGame(seed);
  step(g, { type: 'torch' });
  if (strategy === 'careless') {
    travel(g, 180, 110);
    advance(g, 3300);
    return g;
  }
  for (const id of ['sevim', 'burak', 'derya', 'hacer']) {
    const r = g.people.find((p) => p.id === id)!;
    if (!r.atHome || r.status === 'safe' || r.status === 'escaping' || r.status === 'helping') continue;
    travel(g, r.x, r.y);
    if (strategy === 'silent') {
      advance(g, 150);
      continue;
    }
    if (!r.booksReady) {
      step(g, { type: 'speak', id, line: 'books' });
      advance(g, 100);
    }
    step(g, { type: 'speak', id, line: 'route' });
    step(g, { type: 'speak', id, line: 'together' });
    if (r.status === 'waiting') step(g, { type: 'speak', id, line: 'come' });
  }
  travel(g, 180, 450);
  advance(g, 3300);
  return g;
}
describe('twenty seeded nights', () => {
  it('measures silent, careless and informed strategies with exact replay', () => {
    const measurements = Array.from({ length: 20 }, (_, i) => i + 1).flatMap((seed) =>
      (['silent', 'careless', 'competent'] as const).map((strategy) => {
        const g = bot(seed, strategy);
        const run = exportRun(g);
        expect(stateHash(replayRun(run))).toBe(run.hash);
        return {
          seed,
          strategy,
          phase: g.phase,
          ticks: g.tick,
          rescued: g.rescued.length,
          home: g.people.filter((r) => r.atHome).length,
          breath: g.breath,
          deadline: g.deadline,
          hfTicks: g.hfTicks,
          hash: run.hash,
        };
      }),
    );
    if (process.env.SMOKE_MEASUREMENT_PATH)
      writeFileSync(
        process.env.SMOKE_MEASUREMENT_PATH,
        `${JSON.stringify({ engine: '3.2.0', measurements }, null, 2)}\n`,
      );
    console.log(
      JSON.stringify({
        strategies: ['silent', 'careless', 'competent'].map((strategy) => ({
          strategy,
          wins: measurements.filter((m) => m.strategy === strategy && m.phase === 'won').length,
          breathLosses: measurements.filter(
            (m) => m.strategy === strategy && m.breath === 1 && m.ticks < m.deadline,
          ).length,
        })),
      }),
    );
    expect(measurements.filter((m) => m.strategy === 'silent' && m.phase === 'won')).toHaveLength(0);
    expect(
      measurements.filter((m) => m.strategy === 'careless' && m.breath === 1 && m.ticks < m.deadline).length,
    ).toBeGreaterThan(0);
    expect(
      measurements.filter((m) => m.strategy === 'competent' && m.phase === 'won').length,
    ).toBeGreaterThanOrEqual(16);
  });
});
