# First slice checks — 2026-10-26

Seven focused simulation tests pass: canonical cast, HF minute boundaries, refusal with pressure/trust cost, autonomous route and help, all-four rescue, partial loss, exact replay and corrupt export rejection. Strict typecheck and Biome pass.

Production-build Playwright: 14 passed, two inapplicable WebKit CPU-measurement skips. Chromium and WebKit each cover 360×690 and 1280×800. Checks include refusal text, companion movement, figures above controls, no horizontal overflow, menu pause, keyboard climb, loss outcome, replay hash, and WebGL loss recovery.

Chromium 4× CPU slowdown, measured ticker CPU including simulation and renderer submission: phone p95 2.4 ms / max15.6 ms (135 samples); wide p95 2.0 ms / max14.1 ms (151 samples). This is a local Apple Silicon measurement, not a physical phone or GPU completion benchmark. Automated criterion p95<16 ms. No frame time is promised across all devices.

The first browser pass exposed Pixi autoDensity inline styles overriding responsive canvas size in WebKit. CSS sizing now owns the canvas. Tests run against production preview to cover deployed code; development-only ResizeObserver warnings were observed under Vite/WebKit and not reproduced in production preview.

One independent Codex review found attempt identity reuse in lab recording. Retries and playback now change the trackRun key; playback is marked in recorded export. No blocking/high finding remained. Review receipt: coordinator scratch ng-smoke/independent-review.md.

Automated refusal checks show text and HF refusal state. They do not establish human understanding. The coordinator's panel must observe whether players interpret the refusal and change action.

Root also completed an ordinary live-time browser rescue in the existing Chrome profile, using person selection, speech, torch and a tap on the ground-floor landing. All four reached the door. The same run was inspected at360×690 and1280×800. The outcome exposed repeated identical arrival lines; they were replaced with distinct, outcome-grounded lines.

Live verification caught Pixi's default dynamic shader/uniform generation being blocked by release CSP. Added Pixi's built-in eval-free polyfill (`pixi.js/unsafe-eval`) before initialization. Preview now serves the actual release CSP, and e2e asserts its header. No unsafe-eval CSP permission was added.

Eval-free release-CSP rerun:7 simulation and14 browser checks pass (2 inapplicable skips). Chromium4x phone CPU p951.5ms/max12.1ms(153 samples); wide p951.7ms/max13.3ms(152 samples).
