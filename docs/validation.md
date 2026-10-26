# Iteration 2 verification — 2026-10-26

Claude's design read invalidated the original slice's persuasion and danger claims. This iteration removes the silent-proximity follow rule. HF3.2.0 scores invitations from the person's needs, voice trust and perceived stair evidence. The host supplies movement, smoke and a caretaker breath hazard. It adds no sub-minute HF physiology.

- Twelve simulation tests pass. They include first Come refusal, real repeated-insistence distrust, causal trust ablation through HF's public API, early HF tick, cast/fire variation, smoke collapse, button applicability, companion event coverage and exact replay/corruption checks.
- Sixty fixed-seed bot runs cover seeds1–20 and three strategies. Silent-proximity wins:0/20. Competent wins:20/20, taking39.45–59.5seconds. Careless wins:0/20;5 runs lose breath at ticks2803–2810, before their deadlines. All60 exports replay to their exact full-state hash. The raw rows and reproducible command are in [smoke-measurements.md](smoke-measurements.md) and [smoke-measurements.json](smoke-measurements.json).
- Production-CSP Playwright checks:14 passed,2 inapplicable CPU-measurement skips. Chromium/WebKit each cover360×690 and1280×800, contextual speech and keyboard, actual refusal, all-person event retention, pause/reset/navigation, replay, loss and context recovery.
- Chromium4× CPU: phone p951.6ms/max17.2ms(153samples); wide p951.8ms/max18.1ms(153samples). This measures local Apple Silicon ticker CPU including render submission. It does not establish physical phone/GPU performance.
- Two independent Codex static review lenses found no blocking/high/medium issue on the final slice. Minor Burak dialogue incorrectly promised help for absent Sevim; fixed before final review. Source-hash receipt: coordinator scratch ng-smoke/iteration2-review.md.
- Root phone Chrome play on seed1 rescued all3 home residents after an actual books refusal. Names stayed separate; the history retained all3 arrivals. Root wide Chrome play on seed4 ended at the deadline with Burak out and3 residents taken to hospital; the downloaded run (hash204a8e12) is retained in coordinator scratch. Both complete browser outcomes used ordinary controls, without advancing the lab clock. Release evidence is in the coordinator report.

Bot success is not human comprehension evidence. The coordinator still owns lab round1 and panel acceptance. Current replay format is smoke-2; earlier smoke-1 exports require the old build.

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
