import { describe, expect, it } from 'vitest';
import { createGame, exportRun, type Game, type Input, replayRun, stateHash, step } from './sim';

function advance(g: Game, n: number) {
  for (let i = 0; i < n; i++) step(g);
}
function travel(g: Game, x: number, y: number) {
  step(g, { type: 'move', x, y });
  for (let i = 0; i < 700 && (g.player.x !== x || g.player.y !== y); i++) step(g);
  expect(g.player.x).toBe(x);
  expect(g.player.y).toBe(y);
}
function rescueRun(seed: number) {
  const g = createGame(seed);
  step(g, { type: 'torch' });
  for (const id of ['sevim', 'derya', 'hacer']) {
    const person = g.people.find((p) => p.id === id)!;
    travel(g, person.x, person.homeY);
    advance(g, id === 'sevim' ? 150 : 65);
    step(g, { type: 'speak', id, line: 'together' });
  }
  travel(g, 180, 450);
  advance(g, 650);
  return g;
}

describe('Smoke fixed-step host', () => {
  it('starts one canonical profile per resident with HF 3.2 and minute-boundary clocks', () => {
    const g = createGame(7);
    expect(g.people.map((p) => p.name)).toEqual(['Sevim', 'Burak', 'Derya', 'Hacer']);
    advance(g, 1199);
    expect(g.people.every((p) => p.hf.now === 370)).toBe(true);
    step(g);
    expect(g.people.every((p) => p.hf.now === 371)).toBe(true);
  });
  it('makes an understood refusal and books pressure for repeated shouts through HF', () => {
    const g = createGame(7);
    travel(g, 92, 365);
    const sevim = g.people[0]!;
    // Arrival permits hearing. It does not instantly finish her bundle.
    const initial = sevim.hf.will.voices.find((v) => v.voiceId === 'player')!.trust;
    for (let i = 0; i < 12; i++) step(g, { type: 'speak', id: 'sevim', line: 'come' });
    expect(sevim.booksReady).toBe(false);
    expect(sevim.resolution?.verdict).not.toBe('assented');
    expect(sevim.line).toContain('books');
    expect(sevim.hf.will.voices.find((v) => v.voiceId === 'player')!.trust).toBeLessThan(initial);
  });
  it('lets Burak check a route and help Sevim without an order', () => {
    const g = createGame(7);
    advance(g, 700);
    expect(g.routeFound).toBe(true);
    expect(g.people[0]!.booksReady).toBe(true);
    expect(g.events.some((e) => e.text.includes('Burak: The front stair'))).toBe(true);
  });
  it('supports all four walking to safety with care and a visible route', () => {
    const g = rescueRun(7);
    expect(g.phase).toBe('won');
    expect(g.rescued).toHaveLength(4);
    expect(g.people.every((p) => p.status === 'safe')).toBe(true);
  });
  it('ends a short unattended run with actual partial rescue and no deaths', () => {
    const g = createGame(7);
    advance(g, 3300);
    expect(g.phase).toBe('lost');
    expect(g.rescued.length).toBeGreaterThan(0);
    expect(g.rescued.length).toBeLessThan(4);
    expect(g.people.every((p) => p.hf.body.alive)).toBe(true);
    expect(g.people.some((p) => p.status === 'hospital')).toBe(true);
    expect(g.tick).toBe(g.deadline);
  });
  it('replays the exported input log, HF state and final hash exactly', () => {
    const g = rescueRun(19),
      run = exportRun(g);
    expect(stateHash(replayRun(run))).toBe(run.hash);
    expect(run.state).toEqual(g);
    const corrupted = structuredClone(run);
    corrupted.inputs[0]!.input = { type: 'move', x: 180, y: 110 } satisfies Input;
    expect(() => replayRun(corrupted)).toThrow('hash mismatch');
  });
  it('rejects invalid movement coordinates and leaves a finished run unchanged', () => {
    const g = createGame(3);
    step(g, { type: 'move', x: Number.NaN, y: 110 });
    expect(g.player.targetY).toBe(450);
    advance(g, 3300);
    const hash = stateHash(g);
    step(g, { type: 'torch' });
    expect(stateHash(g)).toBe(hash);
  });
});
