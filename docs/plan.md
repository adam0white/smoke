# Smoke implementation plan

Goal: finish the small night and verify delivery. Design: docs/design.md.

- [ ] Simulation: HF people, visible refusal, autonomous help, fixed tick input replay. Prove moving companion/refusal first, then win/loss/partial and replay hashes.
- [ ] View: cut-paper Pixi renderer, keyboard and touch, figures above thumbs, notice, feedback, pause, export, lab tools.
- [ ] Integrate: strict tooling, focused Vitest, Chromium/WebKit both sizes, context loss and CPU frame check.
- [ ] Independent Codex review. Fix verified findings, run required checks.
- [ ] Signed source, green CI exact commit, clean build/deploy and manifest. Central listing in isolated delivery lane; coordinator deploys central site.
- [ ] Readiness board/report, exact PID cleanup, final worktree lists.

Review focus: repeated shouts; burst input replay; background time; blocked storage; touch hit targets and WebGL context loss.
