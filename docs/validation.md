# HF 4.4.0 migration — 2026-10-27

The candidate pins published HF 4.4.0 and the lab-client 0.5.2 release artifact. Current exports are smoke-6. Old files are refused with a keep-file/start-fresh message. A seed query selects run data; no gameplay or diagnostic query flag remains.

The lane passes 43 tests. They include suggestion/refusal and pressure, seen-stair recovery, finite accepted movement, actual safety receipts, active-work continuation through completion, pending-request identity, read-only preview, strict host checkpoint validation, exact HF replay and complete game replay. Injecting an invalid outcome receipt proves that the complete world and HF checkpoint remain unchanged; the same tick then succeeds with a valid receipt. HF rollback replays accepted public transactions only. No framework internals or local belief/trust/body kernel is used.

One headless seed-7 control compares silent, competent and visible-text play, with exact replay of each export. Silent play loses; competent and visible-text play win. The existing twenty-seed/six-policy measurement and its assertions remain available through `SMOKE_MEASUREMENT_PATH=... pnpm test src/sim-bots.test.ts`. Its historical HF 3.2.0 numbers below have not been remeasured on HF 4.4.0 and are not current claims.

Local browser checks passed 22 cases, with two inapplicable WebKit CPU skips, then all four corrected loss/replay cases passed in Chromium and WebKit at phone and wide sizes. The loss assertion now reports actual individual status, including Burak's independent escape on HF 4.4.0. After reducing tick staging to copy only mutable containers, the focused Chromium fourfold CPU check passed at p95 2.1 ms phone and 2.3 ms wide; maximum observed frames were 127.5/128.8 ms. These are local automated measurements, not physical-phone or human-playtest evidence. Exact CI and deployment receipts belong in the delivery report.

Independent review found movement outliving accepted HF work, metadata publication before input acceptance, and chronological outcome/staging issues. Those findings were fixed; the reviewer found no remaining material code finding in the fixes. A stale HF3 design claim was corrected. The coordinator still owns panel acceptance.

# Iteration 4 verification — 2026-10-26

The owner allowed death in this possible night. Each resident accumulates local smoke exposure against a seeded per-person tolerance. Time spent inside and thicker smoke increase exposure. Warnings appear at half and three-quarters of the limit. Residents outside stop accumulating exposure. HF3.2.0 still owns decisions; the host owns the hazard.

23 unit and simulation tests pass. The new tests cover death, cumulative exposure, location, seeded tolerances, outside protection, individual ending attribution, early firefighter survival, terminal speech/action guards, dead-Sevim helper behavior, and rejection of historical replay versions.

Seeds1–20,80 runs, all exact full-state replay:

| Policy                  |  Wins | Escorted | Solo | Hospital | Dead |
| ----------------------- | ----: | -------: | ---: | -------: | ---: |
| Competent               | 20/20 |       48 |   16 |        0 |    0 |
| Cold, visible text only | 20/20 |       48 |   16 |        0 |    0 |
| Silent                  |  0/20 |        0 |    7 |        1 |   56 |
| Careless                |  0/20 |        0 |    7 |        3 |   54 |

Cold wins take42.85–77.8s; competent39.45–59.5s. Idle first deaths across these seeds occur88.45–142.75s into the night. These are fixed-seed game measurements, not a human comprehension result or physiological model. Raw rows: [iteration4-measurements.json](iteration4-measurements.json). Reproduce with `SMOKE_MEASUREMENT_PATH=docs/iteration4-measurements.json pnpm test src/sim-bots.test.ts`.

Browser checks:26passed,2inapplicable WebKit CPU skips at360×690 and1280×800 in Chromium and WebKit. Both win and partial endings replay exactly. A rendered-text policy deliberately leaves Derya inside: Sevim and Hacer walk out with the caretaker, Burak escapes alone, and Derya dies. The heading counts2escorted. A focused4-project rerun after warning changes also passes. Retained phone/wide screenshots show the complete ending without clipping. Chromium4× CPU initial local p95:2.8ms phone,2.2ms wide; unchanged16ms gate.

The first iteration4 CI (6726551, run40317627440) passed24browser checks but timed out both Chromium partial-run checks at60s. The partial policy kept polling an unchanged DOM until the fire ended. The harness now confirms all intended rescues show Outside/Away tonight, then advances the abandoned resident’s remaining night in one lab-clock call. It retains the named outcome, escorted count, solo escape and exact replay assertions. No gameplay change or timeout increase was made.

One independent read-only Codex review of the finished slice found no unresolved findings, including the dead-Sevim helper guard. Final CI and live receipts are recorded in the coordinator report.

Replay format is now smoke-4 (2026-10-27: lost and pushed followers). Before that it was smoke-3. Changed hazard state/mechanics intentionally require older smoke-2 exports to use their original build. New exports replay exactly; HF remains3.2.0.

# Iteration 2 verification — 2026-10-26

Claude's design read invalidated the original slice's persuasion and danger claims. This iteration removes the silent-proximity follow rule. HF3.2.0 scores invitations from the person's needs, voice trust and perceived stair evidence. The host supplies movement, smoke and a caretaker breath hazard. It adds no sub-minute HF physiology.

- Twelve simulation tests pass. They include first Come refusal, real repeated-insistence distrust, causal trust ablation through HF's public API, early HF tick, cast/fire variation, smoke collapse, button applicability, companion event coverage and exact replay/corruption checks.
- Sixty fixed-seed bot runs cover seeds1–20 and three strategies. Silent-proximity wins:0/20. Competent wins:20/20, taking39.45–59.5seconds. Careless wins:0/20;5 runs lose breath at ticks2803–2810, before their deadlines. All60 exports replay to their exact full-state hash. The raw rows and reproducible command are in [smoke-measurements.md](smoke-measurements.md) and [smoke-measurements.json](smoke-measurements.json).
- Production-CSP Playwright checks:14 passed,2 inapplicable CPU-measurement skips. Chromium/WebKit each cover360×690 and1280×800, contextual speech and keyboard, actual refusal, all-person event retention, pause/reset/navigation, replay, loss and context recovery.
- Chromium4× CPU after DOM update caching: phone p951.4ms/max16.1ms(150samples); wide p951.4ms/max10.1ms(153samples). This measures local Apple Silicon ticker CPU including render submission. It does not establish physical phone/GPU performance.
- Two independent Codex static review lenses found no blocking/high/medium issue on the final slice. Minor Burak dialogue incorrectly promised help for absent Sevim; fixed before final review. Source-hash receipt: coordinator scratch ng-smoke/iteration2-review.md.
- Root phone Chrome play on seed1 rescued all3 home residents after an actual books refusal. Names stayed separate; the history retained all3 arrivals. Root wide Chrome play on seed4 ended at the deadline with Burak out and3 residents taken to hospital; the downloaded run (hash204a8e12) is retained in coordinator scratch. Both complete browser outcomes used ordinary controls, without advancing the lab clock. Release evidence is in the coordinator report.

Bot success is not human comprehension evidence. The coordinator still owns lab round1 and panel acceptance. Current replay format is smoke-2; earlier smoke-1 exports require the old build.

The first iteration2 CI (7020598, run40289428241) failed only the phone CPU gate at18.3ms p95;13 other checks passed and2 were inapplicable. Unchanged button text was being rebuilt every20Hz step. A DOM projection cache now skips unchanged writes and layout work. A focused independent Codex review found no invalidation issue. The same16ms threshold remains. The final local lane and all14 browser checks passed again.

## Historical first slice checks (773ed0e)

Seven focused simulation tests pass: canonical cast, HF minute boundaries, refusal with pressure/trust cost, autonomous route and help, all-four rescue, partial loss, exact replay and corrupt export rejection. Strict typecheck and Biome pass.

Production-build Playwright: 14 passed, two inapplicable WebKit CPU-measurement skips. Chromium and WebKit each cover 360×690 and 1280×800. Checks include refusal text, companion movement, figures above controls, no horizontal overflow, menu pause, keyboard climb, loss outcome, replay hash, and WebGL loss recovery.

Chromium 4× CPU slowdown, measured ticker CPU including simulation and renderer submission: phone p95 2.4 ms / max15.6 ms (135 samples); wide p95 2.0 ms / max14.1 ms (151 samples). This is a local Apple Silicon measurement, not a physical phone or GPU completion benchmark. Automated criterion p95<16 ms. No frame time is promised across all devices.

The first browser pass exposed Pixi autoDensity inline styles overriding responsive canvas size in WebKit. CSS sizing now owns the canvas. Tests run against production preview to cover deployed code; development-only ResizeObserver warnings were observed under Vite/WebKit and not reproduced in production preview.

One independent Codex review found attempt identity reuse in lab recording. Retries and playback now change the trackRun key; playback is marked in recorded export. No blocking/high finding remained. Review receipt: coordinator scratch ng-smoke/independent-review.md.

Automated refusal checks show text and HF refusal state. They do not establish human understanding. The coordinator's panel must observe whether players interpret the refusal and change action.

Root also completed an ordinary live-time browser rescue in the existing Chrome profile, using person selection, speech, torch and a tap on the ground-floor landing. All four reached the door. The same run was inspected at360×690 and1280×800. The outcome exposed repeated identical arrival lines; they were replaced with distinct, outcome-grounded lines.

Live verification caught Pixi's default dynamic shader/uniform generation being blocked by release CSP. Added Pixi's built-in eval-free polyfill (`pixi.js/unsafe-eval`) before initialization. Preview now serves the actual release CSP, and e2e asserts its header. No unsafe-eval CSP permission was added.

Eval-free release-CSP rerun:7 simulation and14 browser checks pass (2 inapplicable skips). Chromium4x phone CPU p951.5ms/max12.1ms(153 samples); wide p951.7ms/max13.3ms(152 samples).
