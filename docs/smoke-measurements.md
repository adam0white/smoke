# Smoke headless measurements

Measured 2026-10-26. This is automated simulation evidence, not player-panel evidence.

The adjacent `smoke-measurements.json` records all 60 runs: seeds 1 through 20, three strategies per seed. Every export was replayed from its inputs and checked against the full-state hash, including HF state. The bot does not alter simulation state. Test-only trust ablation separately uses HF's public `seedVoice` API.

| Strategy  | Behavior                                                                                                                                               | Wins  | Predeadline breath losses |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------- |
| Silent    | Torch on; visit each resident, wait 150 ticks beside them, return outside                                                                              | 0/20  | 0/20                      |
| Careless  | Torch on; climb to the top landing and stay there                                                                                                      | 0/20  | 5/20                      |
| Competent | Torch on; visit residents; request books and wait for completion when needed; show the stair; invite gently; use Come if still waiting; return outside | 20/20 | 0/20                      |

Competent wins took 789–1190 ticks (39.45–59.5 seconds at 20 Hz). Careless breath losses took 2803–2810 ticks, before their deadlines. The other careless runs reached the deadline. These measurements do not establish that human players will understand the choices or consistently win.

Each seed authors who is away, who was asleep, whose HF autonomy need is stronger, and the smoke's starting landing. A resident marked asleep has higher authored HF sleep pressure and waits for a voice before choosing. This marker describes their starting situation; it is not HF's physiological sleep model. Smoke propagates from its origin by one landing per 100 ticks. Thick and thin waves change movement speed and breath exposure. The fixed deadline remains 3000–3200 ticks.

HF starts at minute 369. The first step settles the minute preceding the player's arrival to minute 370. Later steps tick HF at minute boundaries. A quick win therefore includes a genuine HF tick without claiming subminute HF physiology. Route evidence uses HF perception and belief APIs. HF decides actions and owns voice trust, insistence, and refusal. The host exposes a follow offer only when the player invites a resident; standing nearby cannot create it.

Regression tests verify first-request Sevim refusal, bundling only after an HF choice, repeated insisted requests reaching HF distrust, and different invitation outcomes when only authored HF voice trust changes. They also compare thick/thin crossing time and breath, test predeadline collapse, and verify exact replay and corruption rejection.

Reproduce with the repository's pinned runtime:

```sh
SMOKE_MEASUREMENT_PATH=docs/smoke-measurements.json pnpm test src/sim.test.ts src/sim-bots.test.ts
```
