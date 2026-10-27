# Smoke on the Stairs

A fire in Lale Apartmanı. You are the caretaker. Four neighbours can walk out. They must decide to leave, and they can refuse you.

## What ends the work

A complete small run, deterministic replay export, exact HF 3.2.0 pin, signed source, exact green CI, live release manifest, central listing ready, independent Codex review, and lab round 1 readiness. The coordinator owns the panel and retest. Adam accepts the new-games increment on 2026-11-03. This delivery does not claim panel acceptance.

## Win and loss

Lead everyone who is home through the front door before the stair closes or the caretaker loses breath. The seed changes who needs rescuing and where smoke starts. Run length is measured by the fixed-seed bot controls in docs/validation.md, rather than promised in advance. A lost run names who walked out with you, who escaped alone, and who was left inside. People left inside may die. The owner allowed death on 2026-10-26; this supersedes the earlier review constraint. Death belongs to this possible night and changes no other game. Partial rescue is an outcome. Reruns show how this night could have gone. This game never writes into Stairwell.

## Why this is a game

Movement spends time. A shout can burn trust. Choosing how to answer Sevim costs time that Hacer may need. Silent proximity cannot rescue everyone. Burak knows something you do not: he checks the exit and returns to help Sevim without an order. Smoke waves lengthen visibly before closure. You can learn when to cross and choose whom to believe. There is no score or hidden correct dialogue sequence.

## Technology and HF

PixiJS 8 WebGL renders a cut-paper stairwell at 60 fps. TypeScript 7 strict runs one deterministic simulation at 20 Hz on the main thread. HF stays an imported 3.2.0 package. HF owns people, decisions, assent and voice trust. Host code owns positions, fire, visible speech, and offered actions. Inputs enter on a tick and replay without wall time. The current rules version exports as smoke-5 because resident hazard state and ending semantics change; older exports require their original build and are explicitly rejected by this build. HF settles the preceding minute on the first step, before any rescue can succeed, then ticks on minute boundaries. Route observations enter through HF perception. HF owns trust, need scoring, assent and refusal. The host does not simulate fast arousal; its smoke and caretaker breath are game hazards, not HF physiology. Resident smoke exposure also belongs to the host hazard. Each fixed tick adds the smoke density at the resident’s current floor. A per-seed, per-person tolerance of 850–1200 density-ticks determines when exposure becomes fatal. Outside residents stop accumulating exposure. This is a game rule, not a physiological model. Early evacuation remains possible; later and thicker smoke consumes more of that margin. The existing fast-response request remains with the all director.

Opus recommends the main thread; the concept prefers a Worker. We choose the main thread because four people do not justify an input round trip. Both reviews require persuasion, readable refusal, independent companion help, no canonical death, and actual partial outcomes. The first slice adopted those constraints. Iteration 4 follows the owner’s later permission for death in this possible night; all other agreed review changes remain. Astra proposes Cross Together as another game; it is outside this brief. The later stack trial confirmed direct PixiJS/HF integration and short-run deterministic replay at both sizes. This iteration keeps PixiJS because the faults are in the game design, not its rendering stack.

## Cast

Hacer (58), Burak (31), Sevim (69), Derya (44), using their canonical identities. Tarık is away. Hacer's uncertainty comes from being a guest, not frailty. Everyone who decides to go can walk out. No one becomes cargo. No new foreground person is introduced. The fire, hospital and death outcomes belong only to this game's possible night.

## Phone and keyboard

At 360×690 the building occupies the space above a separate bottom thumb area. A tap on a landing moves; a tap on a figure selects. Speech buttons remain below the figures. Keyboard at 1280×800 uses arrows/WASD, selection and speech shortcuts. A focused line makes the person's reason explicit; hesitation alone is insufficient. Iteration 3 adds a visible Street button, a current status under every name, and DOM text for smoke-wave and closure timing. Following means walk toward the caretaker, then wait beside them until the caretaker moves. The screen tells the player to lead followers to the street. Feedback pauses. Background tabs do not accrue simulation catch-up.

## Evidence gates

First test one moving companion and Sevim's refusal before expanding the run. Browser checks must show her stated reason and an available response. That is a readability proxy; only actual panel play can establish whether players understand and change action. Measure Chromium under 4× CPU slowdown and report the actual frame distribution. Do not call an automated proxy human evidence.

## Deferred

- 2026-11-03: panel observation of refusal readability and whether players change action; coordinator owns panel.
- 2026-11-03: longer six-minute run and sound, after the short run proves persuasion.
- 2026-11-03: carrying a downed person, only if it improves this game without turning people into cargo.
- 2026-11-03: cross-game continuation remains deliberately absent; needs a separate reviewed decision.
- 2026-11-03: HF fast response request review by the all director; no local framework substitute.

## Route evidence rule — 2026-10-27

The coordinator rejected the torch-on, repeated Come now strategy that never shows the stair. Torchlight now lights the caretaker but does not establish a resident's route. A following resident who has not seen the stair stops during thick smoke, even with the torch on. The player can approach, show the stair, and invite them again. Thin smoke still permits following without route evidence. HF still owns assent, refusal and protest; this changes only the host's hazard and movement rule. Burak's independent stair check still establishes his own route.

Measured before at base `5b2fab9`, and after this rule, on the same seeds 1–20 at 20 Hz. Each strategy uses the same inputs and cadence before and after. Repeated pushing uses one command plus five ticks per loop, approaches a waiting resident, presses Come now until someone follows, then leads them to Street; it never shows the stair or helps with books. The torch variant switches the torch on once. Careful play uses the existing `competent` policy: torch, books where needed, route evidence, gentle invitation, then Street.

| Strategy                                         | Before | After |
| ------------------------------------------------ | -----: | ----: |
| Torch on, push, never show stair (`torch-pushy`) |  18/20 |  7/20 |
| Careful (`competent`)                            |  20/20 | 20/20 |
| Careless, push without torch (`pushy`)           |   6/20 |  6/20 |

The older policy named `careless` is an idle upper-floor exposure control, not the coordinator's careless pushing policy; it remains 0/20. The visible-text `cold` control remains 20/20. These are deterministic bot measurements, not human playtest evidence. All 120 exports in each measurement (six policies × 20 seeds) replayed to their exact complete-state hash. Primary-strategy rows are in [route-rule-measurements.json](route-rule-measurements.json). Reproduce the after measurement with `SMOKE_MEASUREMENT_PATH=/tmp/smoke-after.json pnpm test src/sim-bots.test.ts`. The added torch policy was also run against the unchanged baseline before applying the rule.

The targeted regression covers stopping with the torch on and recovery by showing the stair; the existing headless controls cover successful careful play. No panel or human playtest was run. Gameplay and seeded nights are public without `?lab`; the pause menu has one collapsed Debug item beside Lab privacy, with seed/tick and an exact replay check. The diagnostic browser API and bounded frame samples no longer require a query flag.

HF remains pinned to 3.2.0 for this delivery. No bridge or HF decision code changed. A later builder applying `~/code/.lab-scratch/stale-patches/smoke-hf4-smoke.patch` must retain the new `stopsInSmoke` condition, stop/recovery copy, regression and strategy control when resolving its overlapping `src/sim.ts` changes, then remeasure on 4.0.1. The patch's old replay/engine stamps must not overwrite current-version replay checks. Current format is smoke-5; smoke-4 and older exports require their original build.
