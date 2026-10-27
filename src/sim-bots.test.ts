import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coldPolicy } from './cold-policy';
import { readScreen } from './screen';
import { canSpeak, createGame, exportRun, type Game, replayRun, stateHash, step } from './sim';

function advance(g: Game, n: number) {
  for (let i = 0; i < n; i++) step(g);
}
function travel(g: Game, x: number, y: number) {
  step(g, { type: 'move', x, y });
  for (let i = 0; i < 1000 && g.phase === 'playing' && (g.player.x !== x || g.player.y !== y); i++) step(g);
}
type Strategy = 'silent' | 'careless' | 'competent' | 'cold' | 'pushy' | 'torch-pushy';
function bot(seed: number, strategy: Strategy) {
  const g = createGame(seed);
  if (strategy === 'pushy' || strategy === 'torch-pushy') {
    if (strategy === 'torch-pushy') step(g, { type: 'torch' });
    // Press Come now until someone follows, then Street. The careless control has no torch.
    // One command per quarter second, the same cadence as the live driver.
    let stage = 0;
    while (g.phase === 'playing') {
      const following = g.people.some((r) => r.status === 'following');
      const stopped = g.people.filter((r) => r.atHome && r.status === 'waiting' && r.action !== 'books');
      const r = stopped[stage % Math.max(1, stopped.length)];
      if (following || !r) {
        if (g.player.targetY !== 450) step(g, { type: 'move', x: 180, y: 450 });
      } else if (canSpeak(g, r.id, 'come')) {
        step(g, { type: 'speak', id: r.id, line: 'come' });
        stage++;
      } else if (g.player.targetX !== r.x || g.player.targetY !== r.homeY)
        step(g, { type: 'move', x: r.x, y: r.y });
      advance(g, 5);
    }
    return g;
  }
  if (strategy === 'cold') {
    let selected = g.people[0]!.id;
    while (g.phase === 'playing') {
      const command = coldPolicy(readScreen(g, selected));
      if (command?.type === 'select') {
        selected = command.id;
        // Same translation as tapping a person's name in main.ts.
        const person = g.people.find((p) => p.id === selected)!;
        step(g, { type: 'move', x: person.x, y: person.y });
      } else if (command?.type === 'street') step(g, { type: 'move', x: 180, y: 450 });
      else if (command?.type === 'speech')
        step(
          g,
          command.action === 'torch'
            ? { type: 'torch' }
            : { type: 'speak', id: selected, line: command.action },
        );
      advance(g, 20);
    }
    return g;
  }
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
      (['silent', 'careless', 'competent', 'cold', 'pushy', 'torch-pushy'] as const).map((strategy) => {
        const g = bot(seed, strategy);
        const run = exportRun(g);
        expect(stateHash(replayRun(run))).toBe(run.hash);
        return {
          seed,
          strategy,
          phase: g.phase,
          ticks: g.tick,
          rescued: g.rescued.length,
          escorted: g.people.filter((r) => r.exitMethod === 'escorted').length,
          solo: g.people.filter((r) => r.exitMethod === 'alone').length,
          dead: g.people.filter((r) => r.status === 'dead').length,
          hospital: g.people.filter((r) => r.status === 'hospital').length,
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
        `${JSON.stringify({ engine: '3.2.0', replayFormat: 'smoke-5', measurements }, null, 2)}\n`,
      );
    console.log(
      JSON.stringify({
        strategies: ['silent', 'careless', 'competent', 'cold', 'pushy', 'torch-pushy'].map((strategy) => ({
          strategy,
          wins: measurements.filter((m) => m.strategy === strategy && m.phase === 'won').length,
          deaths: measurements.filter((m) => m.strategy === strategy).reduce((n, m) => n + m.dead, 0),
          escorted: measurements.filter((m) => m.strategy === strategy).reduce((n, m) => n + m.escorted, 0),
          solo: measurements.filter((m) => m.strategy === strategy).reduce((n, m) => n + m.solo, 0),
          hospital: measurements.filter((m) => m.strategy === strategy).reduce((n, m) => n + m.hospital, 0),
          breathLosses: measurements.filter(
            (m) => m.strategy === strategy && m.breath === 1 && m.ticks < m.deadline,
          ).length,
        })),
      }),
    );
    expect(
      measurements.filter((m) => m.strategy === 'cold' && m.phase === 'won').length,
    ).toBeGreaterThanOrEqual(19);
    expect(measurements.some((m) => m.strategy === 'silent' && m.dead > 0)).toBe(true);
    expect(measurements.filter((m) => m.phase === 'won').every((m) => m.dead === 0 && m.hospital === 0)).toBe(
      true,
    );
    expect(measurements.filter((m) => m.strategy === 'silent' && m.phase === 'won')).toHaveLength(0);
    expect(
      measurements.filter((m) => m.strategy === 'careless' && m.breath === 1 && m.ticks < m.deadline).length,
    ).toBeGreaterThan(0);
    expect(
      measurements.filter((m) => m.strategy === 'competent' && m.phase === 'won').length,
    ).toBeGreaterThanOrEqual(19);
    // Torchlight does not establish a route through thick smoke.
    expect(
      measurements.filter((m) => m.strategy === 'torch-pushy' && m.phase === 'won').length,
    ).toBeLessThanOrEqual(7);
    // Careless pushing without light remains a distinct, occasionally successful control.
    expect(
      measurements.filter((m) => m.strategy === 'pushy' && m.phase === 'won').length,
    ).toBeGreaterThanOrEqual(4);
    // Pushing people into the dark loses most nights.
    expect(
      measurements.filter((m) => m.strategy === 'pushy' && m.phase === 'won').length,
    ).toBeLessThanOrEqual(8);
  }, 30000);
});
