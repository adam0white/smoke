import { expect, it } from 'vitest';
import { readScreen } from './screen';
import { createGame } from './sim';

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
