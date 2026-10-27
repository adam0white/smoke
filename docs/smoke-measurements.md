# Smoke headless measurements

Measured 2026-10-26. This is automated simulation evidence, not player-panel evidence.

The adjacent `smoke-measurements.json` records all 80 runs: seeds 1 through 20, four strategies per seed. Every export was replayed from its inputs and checked against the full-state hash, including HF state. The bot does not alter simulation state. Test-only trust ablation separately uses HF's public `seedVoice` API.

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


## Iteration 3: cold policy

`cold-policy.ts` receives only the `readScreen` projection rendered in main.ts: names, status words, guidance words, selected name, enabled speech controls, torch state and smoke-clock text. It has no Game, seed, coordinates, HF state, route knowledge or task countdown access. Every simulated second it chooses a name, an available speech control, or the visible Street button. Name and Street commands use the same input translation as the UI. It follows explicit instructions, waits for books, and leads each agreed follower outside before choosing another stopped person.

The fixed seeds 1–20 retain all three earlier strategies and add cold policy. Cold policy wins 20/20 in 857–1556 ticks (42.85–77.8 seconds). All 80 exports replay to the full-state hash. The browser suite separately constructs this policy's observation from rendered DOM text and enabled buttons; only time advancement uses the lab API. These are automated controls, not evidence from a first-time human.

## Iteration 5: pushing people into the dark (2026-10-27)

The repository's "careless" bot (torch on, climb to the top, stay) never matched what a careless human does. A live pass found the real careless play: no torch, press Come now until each neighbour follows, then Street. That won 4 of 4 live nights in 36–69 seconds. A fifth headless strategy, **pushy**, reproduces it from `canSpeak` and positions, one command per quarter second.

Two costs now come from the fiction and from HF:

- **Lost in the dark.** In a thick wave, a follower who has never seen the stair, with the torch off, loses the caretaker and stops where they stand: "I cannot see you or the stair in this smoke." They stay stopped until spoken to again or shown the stair, and they will not move off in that wave: "Not in this smoke. Ask me again when it thins." Each push still reaches HF, so insisting keeps spending trust until HF refuses ("You keep pushing…").
- **Following under protest.** When HF marks a follow as compliance under protest (`Activity.protest`, after an insisted Come), the follower walks at 1.0 instead of 1.7 and also stops in a thick wave: "I have stopped. You pushed me into thick smoke." The name reads "Following under protest · walking slowly".

| Strategy  | Before (wins / deaths) | After (wins / deaths) |
| --------- | ---------------------- | --------------------- |
| Silent    | 0/20 / 56              | 0/20 / 56             |
| Careless  | 0/20 / 54              | 0/20 / 54             |
| Competent | 20/20 / 0              | 20/20 / 0             |
| Cold      | 20/20 / 0              | 20/20 / 0             |
| Pushy     | 20/20 / 0              | 6/20 / 15             |

Exports move to replay format smoke-4. Pushy losses all reach the deadline with one or two people dead. Not covered: pushing with the torch on but never showing the stair still wins 18/20 (2 deaths) in a one-off measurement. Followers can see by the torch, so only the protest cost applies. Browser runs on the local build: careless 360 won (Sevim left without her books after two stops), careless 1280 lost (Derya died after HF distrust), careful 360 and 1280 won.
