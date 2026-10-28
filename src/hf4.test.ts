import { preview } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import { createHumanRun, START } from './hf4';

describe('HF4 game host', () => {
  it('creates an archive with the published engine and the authored cast', () => {
    const game = createHumanRun(7);
    expect(game.archive().engine.package).toBe('@adam0white/human-framework@4.4.0');
    expect(Object.keys(game.archive().current.people)).toHaveLength(4);
  });
});

it('admits and settles an actual action, then replays its archive', async () => {
  const { replay } = await import('@adam0white/human-framework');
  const host = createHumanRun(7);
  const result = host.decide('sevim', 1, [
    { id: 'wait', label: 'wait', expected: { safety: 0.4 }, effort: 0 },
  ]);
  expect(result.some((e: { data: { kind: string } }) => e.data.kind === 'decision')).toBe(true);
  expect(host.active.sevim?.actionId).toBe('wait');
  host.advance(5000);
  const archive = host.archive();
  const verification = replay(archive);
  expect(verification.ok).toBe(true);
  if (verification.ok) expect(verification.value.fullHash).toBe(archive.hashes.full);
});

it('records a player suggestion in HF decision events', () => {
  const host = createHumanRun(3);
  const events = host.decide(
    'hacer',
    1,
    [
      { id: 'wait', label: 'wait', expected: { safety: 0.4 }, effort: 0 },
      { id: 'follow', label: 'follow', expected: { safety: 0.9 }, effort: 0.1 },
    ],
    { affordanceId: 'follow', strength: 0.9 },
  );
  expect(events.some((e) => e.data.kind === 'suggestion-resolved')).toBe(true);
});

it('records observed torchlight in the resident’s held belief', () => {
  const host = createHumanRun(1);
  host.observeStair('hacer', 1);
  expect(host.beliefs('hacer').some((b) => b.prop === 'stair-visible' && b.logOdds > 0)).toBe(true);
});

it('reads the authored player voice relation through HF inspection', () => {
  const host = createHumanRun(2);
  expect(host.voices('hacer').find((v) => v.voiceId === 'player')?.trust).toBe(0.35);
});

it('interrupts active walking when the world stops it', () => {
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'follow', label: 'walk', expected: {}, effort: 0.1 }]);
  expect(host.active.sevim?.actionId).toBe('follow');
  host.interrupt('sevim', 2, 'reached the street');
  expect(host.active.sevim?.id).not.toBeDefined();
});

it('records the observed rescue at an interruption boundary', () => {
  const host = createHumanRun(7, () => ({
    psychological: { safety: 0.9 },
    exposures: [],
    observedProgress: [],
  }));
  host.decide('sevim', 1, [{ id: 'follow', label: 'walk', expected: {}, effort: 0.1 }]);
  host.interrupt('sevim', 2, 'reached the street');
  const receipts = host
    .archive()
    .history.flatMap((t) => t.inputs)
    .filter((i) => i.kind === 'action.resolved');
  const receipt = receipts.find((i) => i.kind === 'action.resolved' && i.payload.stage === 'interrupt');
  expect(receipt?.kind === 'action.resolved' && receipt.payload.outcome?.actual.psychological?.safety).toBe(
    0.9,
  );
});

it('restores an active action and continues with the same complete archive', async () => {
  const { restoreHumanRun } = await import('./hf4');
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'follow', label: 'walk', expected: {}, effort: 0.1 }]);
  const copy = restoreHumanRun(JSON.parse(JSON.stringify(host.checkpoint())));
  const before = host.checkpoint();
  const hypothetical = preview(host.run, {
    perspective: { kind: 'person', observer: 'sevim' },
    person: 'sevim',
    until: START + 30_001,
    inputs: [],
  });
  expect(hypothetical.ok).toBe(true);
  if (hypothetical.ok) expect(hypothetical.value.hypothetical).toBe(true);
  expect(host.checkpoint()).toEqual(before);
  host.advance(30001);
  copy.advance(30001);
  expect(copy.checkpoint()).toEqual(host.checkpoint());
});

it('rejects a checkpoint that omits an accepted active action', async () => {
  const { restoreHumanRun } = await import('./hf4');
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'follow', label: 'walk', expected: {}, effort: 0.1 }]);
  const bad = JSON.parse(JSON.stringify(host.checkpoint()));
  bad.active = {};
  expect(() => restoreHumanRun(bad)).toThrow('active state');
});

it('preserves pending action request identities on restore', async () => {
  const { restoreHumanRun } = await import('./hf4');
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'follow', label: 'walk', expected: {}, effort: 0.1 }], undefined, true);
  const saved = JSON.parse(JSON.stringify(host.checkpoint()));
  expect(saved.archive.current.pending).toHaveLength(1);
  const restored = restoreHumanRun(saved);
  expect(restored.archive().current.pending).toEqual(saved.archive.current.pending);
  host.advance(2);
  restored.advance(2);
  expect(restored.checkpoint()).toEqual(host.checkpoint());
});

it('rejects a checkpoint with a rewound input sequence', async () => {
  const { restoreHumanRun } = await import('./hf4');
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'wait', label: 'wait', expected: {}, effort: 0 }]);
  const bad = JSON.parse(JSON.stringify(host.checkpoint()));
  bad.serial = 0;
  expect(() => restoreHumanRun(bad)).toThrow('sequence');
});

it('leaves the host checkpoint unchanged when a decision batch is rejected', () => {
  const host = createHumanRun(7);
  const before = host.checkpoint();
  expect(() => host.decide('sevim', 1, [{ id: 'wait', label: 'wait', expected: {}, effort: 2 }])).toThrow();
  expect(host.checkpoint()).toEqual(before);
});

it('rejects a checkpoint whose saved scheduler boundary was changed', async () => {
  const { restoreHumanRun } = await import('./hf4');
  const host = createHumanRun(7);
  host.decide('sevim', 1, [{ id: 'wait', label: 'wait', expected: {}, effort: 0 }]);
  const bad = JSON.parse(JSON.stringify(host.checkpoint()));
  bad.nextAt = null;
  expect(() => restoreHumanRun(bad)).toThrow('scheduler');
});
