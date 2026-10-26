# Iteration 4 — 2026-10-26

The cold recheck confirmed that everyone left inside survives, and solo escape is counted as rescue with the caretaker. This iteration makes both claims accurate.

The owner now allows death in this possible night. That changes the earlier no-death design constraint. Outcomes remain inside Smoke; they change no other game.

1. Add failing simulation tests for seeded cumulative smoke danger, late loss, early rescue protection, and separate exit attribution.
2. Implement deterministic resident exposure and individual outcomes. Preserve HF 3.2.0 decisions and movement. State the danger before play and in visible status text.
3. Replace the ending with named accounts of escorted residents, solo escape, and those left inside. Never count solo escape as escorted rescue.
4. Measure seeds 1–20 with competent, cold-policy, silent and careless bots. Require exact full-state replay for every run. Version the replay contract if simulation semantics change.
5. Check Chromium and WebKit at 360×690 and 1280×800. Inspect both sizes in existing Chrome. Review the finished diff independently with Codex and resolve substantive findings.
6. Run the full lane, sign and push source, wait for green CI on that exact commit, build clean, deploy Smoke, verify live assets and release.json, then update the report, STATUS and board row.

Done and acceptance remain as defined in design.md. The coordinator owns panel/retest. Adam accepts on 2026-11-03.
