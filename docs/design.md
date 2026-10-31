# Smoke on the Stairs

A fire in Lale Apartmanı. You are the caretaker. Four neighbours can walk out. They must decide to leave, and they can refuse you.

## What ends the work

A complete small run, deterministic replay export, exact HF 4.8.0 pin, signed source, exact green CI, live release manifest, central listing ready, independent Codex review, and lab round 1 readiness. The coordinator owns the panel and retest. Adam accepts the new-games increment on 2026-11-03. This delivery does not claim panel acceptance.

## Win and loss

Lead everyone who is home through the front door before the stair closes or the caretaker loses breath. The seed changes who needs rescuing and where smoke starts. Run length is measured by the fixed-seed bot controls in docs/validation.md, rather than promised in advance. A lost run names who walked out with you, who escaped alone, and who was left inside. People left inside may die. The owner allowed death on 2026-10-26; this supersedes the earlier review constraint. Death belongs to this possible night and changes no other game. Partial rescue is an outcome. Reruns show how this night could have gone. This game never writes into Stairwell.

## Why this is a game

Movement spends time. A shout can burn trust. Choosing how to answer Sevim costs time that Hacer may need. Silent proximity cannot rescue everyone. Burak knows something you do not: he checks the exit and returns to help Sevim without an order. Smoke waves lengthen visibly before closure. You can learn when to cross and choose whom to believe. There is no score or hidden correct dialogue sequence.

## Technology and HF

PixiJS 8 WebGL renders a cut-paper stairwell at 60 fps. TypeScript 7 strict runs one deterministic simulation at 20 Hz in a dedicated worker. The main thread renders committed snapshots. Worker requests preserve input order and fence exports and resets behind submitted ticks. HF 4.8.0 owns people, decisions, assent, voice trust, beliefs and bodily change through its public run API. The host owns positions, fire, authored speech, offered actions and actual world outcomes. Lab client 0.5.5 is consumed from its published release artifact.

HF time uses integer milliseconds; each fixed game tick is 50 ms. Following is a sequence of finite walking intervals. An interval does not promise eventual rescue: HF must choose the next interval, and the host reports actual progress at its boundary. A resident reaches safety only when their world position reaches the street. Offers and suggestions retain stable identities and registered sources. The host settles each requested action before advancing and publishes staged world changes only after HF accepts their receipts.

New exports use smoke-8 and retain the seed, ordered timed game inputs, complete host state and exact HF archive with engine identity and hashes. HF replay and rebuilding Smoke from its input log are separate checks. Unsupported exports are refused with a keep-file/start-fresh message. This migration does not preserve 3.x numerical behavior or old exports.

Smoke and caretaker breath remain game hazards. Resident smoke exposure also belongs to the host hazard. Each fixed tick adds the smoke density at the resident’s current floor. A per-seed, per-person tolerance of 850–1200 density-ticks determines when exposure becomes fatal. Outside residents stop accumulating exposure. This is a game rule, not a physiological model. Early evacuation remains possible; later and thicker smoke consumes more of that margin. No local body, trust or decision kernel substitutes for HF.

Every gameplay feature is public. Query strings do not enable gameplay or diagnostics. The seed parameter selects the night’s data. Diagnostics remain in one collapsed Debug item beside lab privacy.

The original slice chose the main thread for four people. During the HF 4.4.0 port, repeated CI runs exceeded the unchanged 16 ms frame CPU gate. Timing breakdowns identified simulation work. The port moves that work into a worker and separately checks committed ticks and backlog so smooth drawing cannot hide delayed simulation. Both reviews require persuasion, readable refusal, independent companion help, no canonical death, and actual partial outcomes. The first slice adopted those constraints. Iteration 4 follows the owner’s later permission for death in this possible night; all other agreed review changes remain. Astra proposes Cross Together as another game; it is outside this brief. The later stack trial confirmed direct PixiJS/HF integration and short-run deterministic replay at both sizes. This iteration keeps PixiJS because the faults are in the game design, not its rendering stack.

## Cast

Hacer (58), Burak (31), Sevim (69), Derya (44), using their canonical identities. Tarık is away. Hacer's uncertainty comes from being a guest, not frailty. Everyone who decides to go can walk out. No one becomes cargo. No new foreground person is introduced. The fire, hospital and death outcomes belong only to this game's possible night.

## Phone and keyboard

At 360×690 the building occupies the space above a separate bottom thumb area. A tap on a landing moves; a tap on a figure selects. Speech buttons remain below the figures. Keyboard at 1280×800 uses arrows/WASD, selection and speech shortcuts. A focused line makes the person's reason explicit; hesitation alone is insufficient. Iteration 3 adds a visible Street button, a current status under every name, and DOM text for smoke-wave and closure timing. Following means walk toward the caretaker, then wait beside them until the caretaker moves. The screen tells the player to lead followers to the street. Feedback pauses. Background tabs do not accrue simulation catch-up.

## Walk cue (2026-10-31)

The first LIGHT panel could not tell whether a landing tap had registered. Native pointer taps already set the walk target on phone and desktop; the screen did not say so. A line under the controls now states where the caretaker is, where the last tap sends them and the time left at the current speed (thick smoke slows it, and the line says so). A ring marks the destination and the caretaker carries a YOU label. A second tap only changes the destination; it never restarts the walk. Followers walk to the caretaker, so they leave when the caretaker is at the street; the line says this. Speed, clock and difficulty are unchanged.

## Evidence gates

First test one moving companion and Sevim's refusal before expanding the run. Browser checks must show her stated reason and an available response. That is a readability proxy; only actual panel play can establish whether players understand and change action. Measure Chromium under 4× CPU slowdown and report the actual frame distribution. Do not call an automated proxy human evidence.

## Deferred

- 2026-11-10: preferences from the first LIGHT panel, not mechanism faults: faster walk, longer clock, richer death narration, per-person numeric clocks, an empty Feedback draft with an extra Back button, hiding key letters on the phone. Walk speed, clock and difficulty change only after a separate C14 human-speed comparison.
- 2026-11-10: whether "Show the stair" should unlock the instant a neighbour says she is ready (unproved), and one-tap approach (selection stays two-step; no automatic compliance).
- 2026-11-03: source/input clarification of stable neighbour button names while aiming, asked by Jonas (F-2377) and Marta (F-2389); stale accessible names and tool latency stay qualified, not a broken-pointer claim. Needs source/input clarification before any change.
- 2026-11-03: panel observation of refusal readability and whether players change action; coordinator owns panel.
- 2026-11-03: longer six-minute run and sound, after the short run proves persuasion.
- 2026-11-03: carrying a downed person, only if it improves this game without turning people into cargo.
- 2026-11-03: cross-game continuation remains deliberately absent; needs a separate reviewed decision.
- 2026-11-03: HF fast response request review by the all director; no local framework substitute.

## Historical HF 3.2.0 route evidence — 2026-10-27

The coordinator rejected the torch-on, repeated Come now strategy that never shows the stair. Torchlight now lights the caretaker but does not establish a resident's route. A following resident who has not seen the stair stops during thick smoke, even with the torch on. The player can approach, show the stair, and invite them again. Thin smoke still permits following without route evidence. HF still owns assent, refusal and protest; this changes only the host's hazard and movement rule. Burak's independent stair check still establishes his own route.

Measured before at base `5b2fab9`, and after this rule, on the same seeds 1–20 at 20 Hz. Each strategy uses the same inputs and cadence before and after. Repeated pushing uses one command plus five ticks per loop, approaches a waiting resident, presses Come now until someone follows, then leads them to Street; it never shows the stair or helps with books. The torch variant switches the torch on once. Careful play uses the existing `competent` policy: torch, books where needed, route evidence, gentle invitation, then Street.

| Strategy                                         | Before | After |
| ------------------------------------------------ | -----: | ----: |
| Torch on, push, never show stair (`torch-pushy`) |  18/20 |  7/20 |
| Careful (`competent`)                            |  20/20 | 20/20 |
| Careless, push without torch (`pushy`)           |   6/20 |  6/20 |

The older policy named `careless` is an idle upper-floor exposure control, not the coordinator's careless pushing policy; it remains 0/20. The visible-text `cold` control remains 20/20. These are deterministic bot measurements, not human playtest evidence. All 120 exports in each measurement (six policies × 20 seeds) replayed to their exact complete-state hash. Primary-strategy rows are in [route-rule-measurements.json](route-rule-measurements.json). Reproduce the after measurement with `SMOKE_MEASUREMENT_PATH=/tmp/smoke-after.json pnpm test src/sim-bots.test.ts`. The added torch policy was also run against the unchanged baseline before applying the rule.

The targeted regression covers stopping with the torch on and recovery by showing the stair; the existing headless controls cover successful careful play. No panel or human playtest was run. Gameplay and seeded nights are public without `?lab`; the pause menu has one collapsed Debug item beside Lab privacy, with seed/tick and an exact replay check. The diagnostic browser API and bounded frame samples no longer require a query flag.

That delivery used HF 3.2.0 and smoke-5. The measurements above are historical, not HF 4.4.0 results. The HF 4.4.0 bridge preserves the explicit stop/recovery rule. The focused lane uses one seed with silent, competent and visible-text controls; the historical twenty-seed measurement and its strategy assertions remain available through the command above. Current exports use smoke-6. Smoke-5 and older exports require their original builds; keep those files and start fresh here.
