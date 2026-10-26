import { seedVoice } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import { createGame, exportRun, type Game, replayRun, stateHash, step } from './sim';

function advance(g: Game, n: number) {
  for (let i = 0; i < n; i++) step(g);
}
function travel(g: Game, x: number, y: number) {
  step(g, { type: 'move', x, y });
  for (let i = 0; i < 900 && g.phase === 'playing' && (g.player.x !== x || g.player.y !== y); i++) step(g);
}
describe('Smoke rescue decisions', () => {
  it('cannot rescue everyone by silent proximity, even with the torch', () => {
    const g = createGame(7);
    step(g, { type: 'torch' });
    for (const r of g.people) {
      travel(g, r.x, r.homeY);
      advance(g, 150);
    }
    travel(g, 180, 450);
    advance(g, 3300);
    expect(g.phase).toBe('lost');
    expect(g.people.some((r) => r.atHome && ['hospital', 'dead'].includes(r.status))).toBe(true);
  });
  it('refuses the first Come while Sevim still needs the books', () => {
    const g = createGame(1);
    travel(g, 92, 365);
    step(g, { type: 'speak', id: 'sevim', line: 'come' });
    expect(g.people[0]!.status).toBe('waiting');
    expect(g.people[0]!.line).toContain('books');
    expect(g.people[0]!.resolution?.verdict).not.toBe('assented');
  });
  it('repeated insisted shouts can earn an HF distrust refusal within a run', () => {
    const g = createGame(7);
    travel(g, 92, 365);
    const r = g.people[0]!;
    const before = r.hf.will.voices.find((v) => v.voiceId === 'player')!.trust;
    for (let i = 0; i < 40; i++) step(g, { type: 'speak', id: r.id, line: 'come' });
    expect(r.resolution?.reason).toBe('distrust');
    expect(r.hf.will.voices.find((v) => v.voiceId === 'player')!.trust).toBeLessThan(before);
  });
  it('lets HF voice trust change the same invitation in the same surroundings', () => {
    const trusted = createGame(2),
      distrusted = createGame(2);
    for (const [g, trust] of [
      [trusted, 1],
      [distrusted, 0],
    ] as const) {
      travel(g, 268, 110);
      seedVoice(g.people[3]!.hf, 'player', trust, { replace: true });
      step(g, { type: 'speak', id: 'hacer', line: 'together' });
    }
    expect(trusted.people[3]!.resolution?.verdict).toBe('assented');
    expect(distrusted.people[3]!.resolution?.verdict).not.toBe('assented');
  });
  it('varies who is home, asleep, holding back and where smoke starts', () => {
    const games = Array.from({ length: 20 }, (_, i) => createGame(i + 1));
    for (const key of ['atHome', 'asleep', 'holdingBack'] as const)
      expect(new Set(games.map((g) => JSON.stringify(g.people.map((p) => p[key])))).size).toBeGreaterThan(1);
    expect(new Set(games.map((g) => g.smokeOrigin)).size).toBeGreaterThan(1);
  });
  it('can collapse from smoke before the deadline', () => {
    const g = createGame(7);
    travel(g, 180, 110);
    advance(g, 3000);
    expect(g.phase).toBe('lost');
    expect(g.breath).toBe(1);
    expect(g.tick).toBeLessThan(g.deadline);
  });
  it('advances HF before any possible successful rescue and at minute boundaries', () => {
    const g = createGame(7);
    step(g);
    expect(g.hfTicks).toBe(1);
    expect(g.people.every((r) => r.hf.now === 370)).toBe(true);
    advance(g, 1199);
    expect(g.hfTicks).toBe(2);
    expect(g.people.every((r) => r.hf.now === 371)).toBe(true);
  });
  it('leaves Sevim waiting beside the caretaker until speech starts an HF choice', () => {
    const g = createGame(1);
    step(g, { type: 'torch' });
    travel(g, 92, 365);
    advance(g, 150);
    expect(g.people[0]!.booksReady).toBe(false);
    expect(g.people[0]!.status).toBe('waiting');
    step(g, { type: 'speak', id: 'sevim', line: 'books' });
    advance(g, 90);
    expect(g.people[0]!.booksReady).toBe(true);
    expect(g.people[0]!.status).toBe('waiting');
  });
  it('lets the player cross faster during a thin wave', () => {
    const thin = createGame(1),
      thick = createGame(1);
    step(thin, { type: 'torch' });
    step(thick, { type: 'torch' });
    advance(thick, 220);
    const thinStart = thin.tick,
      thickStart = thick.tick;
    travel(thin, 180, 365);
    travel(thick, 180, 365);
    expect(thick.tick - thickStart).toBeGreaterThan(thin.tick - thinStart);
    expect(thick.breath).toBeGreaterThan(thin.breath);
  });
  it('rejects nonfinite movement and ignores inputs after the run ends', () => {
    const g = createGame(3);
    step(g, { type: 'move', x: Number.NaN, y: 110 });
    expect(g.player.targetY).toBe(450);
    advance(g, 3300);
    const hash = stateHash(g);
    step(g, { type: 'torch' });
    expect(stateHash(g)).toBe(hash);
  });
  it('replays inputs and complete HF state exactly and rejects corruption', () => {
    const g = createGame(19);
    step(g, { type: 'torch' });
    travel(g, 92, 365);
    step(g, { type: 'speak', id: 'sevim', line: 'books' });
    advance(g, 200);
    const run = exportRun(g);
    expect(stateHash(replayRun(run))).toBe(run.hash);
    const bad = structuredClone(run);
    bad.inputs[0]!.input = { type: 'move', x: 180, y: 110 };
    expect(() => replayRun(bad)).toThrow('hash mismatch');
  });
});

describe('resident smoke outcomes', () => {
  it('can kill residents left inside and preserves exact seeded replay', () => {
    const g = createGame(4);
    advance(g, 3300);
    expect(g.people.some((r) => r.status === 'dead')).toBe(true);
    expect(g.phase).toBe('lost');
    expect(stateHash(replayRun(exportRun(g)))).toBe(stateHash(g));
    for (const r of g.people.filter((r) => r.status === 'dead'))
      expect(g.events.some((e) => e.text.includes(r.name) && e.text.includes('died'))).toBe(true);
  });
  it('accumulates smoke exposure over time and varies tolerance by seed and person', () => {
    const g = createGame(4);
    advance(g, 400);
    const before = g.people.map((r) => r.smokeExposure);
    advance(g, 400);
    expect(g.people.every((r, i) => r.smokeExposure > before[i]!)).toBe(true);
    expect(new Set(g.people.map((r) => r.smokeTolerance)).size).toBeGreaterThan(1);
    expect(createGame(9).people[0]!.smokeTolerance).not.toBe(g.people[0]!.smokeTolerance);
  });
  it('gives a resident more exposure near the fire than on a clear landing', () => {
    const smoky = createGame(4),
      clear = createGame(4);
    smoky.people[0]!.y = 365;
    clear.people[0]!.y = 450;
    advance(smoky, 200);
    advance(clear, 200);
    expect(smoky.people[0]!.smokeExposure).toBeGreaterThan(clear.people[0]!.smokeExposure);
  });
  it('leaves early firefighter survivors alive but never counts them as a rescue', () => {
    const g = createGame(4);
    g.deadline = 1;
    step(g);
    expect(g.people.every((r) => r.status === 'hospital')).toBe(true);
    expect(g.rescued).toHaveLength(0);
  });
  it('stops exposure outside and distinguishes escort from autonomous escape', () => {
    const g = createGame(4);
    for (const [i, status] of [
      [0, 'following'],
      [1, 'escaping'],
    ] as const) {
      const r = g.people[i]!;
      r.status = status;
      r.y = 449;
      r.x = 180;
    }
    step(g);
    expect(g.people[0]!.exitMethod).toBe('escorted');
    expect(g.people[1]!.exitMethod).toBe('alone');
    const exposure = g.people[0]!.smokeExposure;
    advance(g, 3300);
    expect(g.people[0]!.status).toBe('safe');
    expect(g.people[0]!.smokeExposure).toBe(exposure);
    expect(g.phase).toBe('lost');
  });
  it('rejects historical replay formats explicitly', () => {
    const run = exportRun(createGame(4));
    expect(run.format).toBe('smoke-3');
    expect(() => replayRun({ ...run, format: 'smoke-2' } as unknown as typeof run)).toThrow(
      'Unsupported Smoke replay version',
    );
  });
});

it('does not let Burak keep helping or alter Sevim after she dies', () => {
  const g = createGame(4);
  const sevim = g.people[0]!,
    burak = g.people[1]!;
  Object.assign(sevim, { status: 'dead', action: 'dead', taskTicks: 79, line: 'Died from smoke inside.' });
  Object.assign(burak, { status: 'helping', action: 'help', x: sevim.x, y: sevim.y });
  g.routeFound = true;
  step(g);
  expect(sevim.booksReady).toBe(false);
  expect(sevim.line).toBe('Died from smoke inside.');
  expect(burak.action).not.toBe('help');
});
