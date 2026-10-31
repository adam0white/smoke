import { expect, it } from 'vitest';
import { readOutcome, readScreen, readWalk } from './screen';
import { createGame, SEVIM_LEFT_BOOKS, step } from './sim';

it('shows every follower and stop reason, plus smoke and closure seconds', () => {
  const g = createGame(4);
  g.people[0]!.asleep = false;
  g.people[2]!.status = 'following';
  const screen = readScreen(g, 'sevim');
  expect(screen.timer).toMatch(/Thin smoke.*thickens in.*Stair closes in/);
  expect(screen.people[0]!.status).toContain('needs help with the books');
  expect(screen.people[2]!.status).toContain('Following');
  expect(screen.guidance).toContain('approach');
});

it('retains the route confirmation before any invitation', () => {
  const g = createGame(4);
  const r = g.people[3]!;
  r.asleep = false;
  r.routeKnown = true;
  r.line = 'I can see the stair in your torchlight. Walk with me.';
  expect(readScreen(g, r.id).dialogue).toBe(r.line);
  expect(readScreen(g, r.id).people[3]!.status).not.toContain('after the last invitation');
});

it('names escorted, solo, hospital and fatal outcomes separately', () => {
  const g = createGame(4);
  Object.assign(g.people[0]!, { status: 'safe', exitMethod: 'escorted' });
  Object.assign(g.people[1]!, { status: 'safe', exitMethod: 'alone' });
  g.people[2]!.status = 'hospital';
  g.people[3]!.status = 'dead';
  g.phase = 'lost';
  const outcome = readOutcome(g);
  expect(outcome.heading).toBe('1 walked out with you.');
  expect(outcome.lines).toEqual([
    'Sevim walked out with you.',
    'Burak escaped alone.',
    'Derya was left inside. Firefighters brought her out alive. She went to hospital with smoke injuries.',
    'Hacer was left inside and died from smoke before firefighters reached her.',
  ]);
  g.people[0]!.line = SEVIM_LEFT_BOOKS;
  expect(readOutcome(g).lines[0]).toBe('Sevim walked out with you, without her books.');
  expect(readScreen(g, 'hacer').people[3]!.status).toBe('Died from smoke');
  expect(readScreen(g, 'hacer').available).toHaveLength(0);
});

it('warns in plain English as exposure grows without hiding follower or stop status', () => {
  const g = createGame(4);
  const r = g.people[2]!;
  r.status = 'following';
  r.smokeExposure = r.smokeTolerance * 0.5;
  expect(readScreen(g, r.id).people[2]!.status).toMatch(/^Following.*Smoke is making breathing difficult/);
  r.smokeExposure = r.smokeTolerance * 0.75;
  expect(readScreen(g, r.id).people[2]!.status).toMatch(/^Following.*Smoke may kill me/);
  r.status = 'waiting';
  expect(readScreen(g, r.id).people[2]!.status).toMatch(/^Stopped.*Smoke may kill me/);
  r.status = 'safe';
  r.exitMethod = 'escorted';
  expect(readScreen(g, r.id).people[2]!.status).toBe('Outside');
});

it('gives a stopped resident a recovery instruction they can use', () => {
  const g = createGame(4);
  const r = g.people[3]!;
  Object.assign(r, { status: 'waiting', action: 'lost', asleep: false });
  Object.assign(g.player, { x: r.x, y: r.y });
  g.torch = true;
  expect(readScreen(g, r.id).people[3]!.status).toContain('Show me the stair');
  expect(readScreen(g, r.id).available).toContain('route');
  r.routeKnown = true;
  expect(readScreen(g, r.id).people[3]!.status).toContain('Wait for thin smoke');
  expect(readScreen(g, r.id).available).not.toContain('route');
});

it('says where the caretaker is and where a landing tap is sending them', () => {
  const g = createGame(1);
  expect(readWalk(g)).toBe('You are at the street.');
  step(g, { type: 'move', x: 180, y: 195 });
  expect(readWalk(g)).toMatch(
    /^You are on the stair between the street and landing 1\. Walking to landing 3 · about \d+ s at this pace\.$/,
  );
  for (let i = 0; i < 60; i++) step(g);
  step(g, { type: 'move', x: 180, y: 450 });
  expect(readWalk(g)).toMatch(/Walking to the street/);
  for (let i = 0; i < 400; i++) step(g);
  expect(readWalk(g)).toBe('You are at the street.');
  step(g, { type: 'move', x: 180, y: 195 });
  for (let i = 0; i < 400; i++) step(g);
  expect(readWalk(g)).toBe('You are on landing 3.');
});

it('gives a bounded walk time and stops saying "Walking" for a fractional pointer target', () => {
  const g = createGame(1);
  step(g, { type: 'move', x: 250.0004, y: 450 });
  const eta = Number(/about (\d+) s/.exec(readWalk(g))?.[1]);
  expect(eta).toBeGreaterThan(0);
  expect(eta).toBeLessThan(30);
  for (let i = 0; i < 400; i++) step(g);
  expect(readWalk(g)).toBe('You are at the street.');
});
