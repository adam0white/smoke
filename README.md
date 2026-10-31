# Smoke on the Stairs

[Play Smoke on the Stairs](https://smoke.adamwhite.work).
You are the caretaker of Lale Apartmanı, an apartment building in Istanbul.
Find who is home among Sevim, Burak, Derya and Hacer. Get them to the street before time or breath runs out.
Neighbours can refuse. Those left inside may die from smoke or leave with firefighters and go
to hospital. This night changes no other game. The pause menu links to **People across games**, but Smoke does not continue people between games.

## How to play

Choose **Enter the stairwell →** to start. Time passes while you play.

- Tap a landing to walk there. A line under the controls says where you are, where the walk is going and about how long it takes at your current pace; a ring marks the destination. A new tap changes the destination and keeps your place. **Street** walks you to the street; anyone following you walks out when you are there. Tap a neighbour or their name button to select
  them and walk towards them. Speak when you are close.
- Hold **WASD** or the **arrow keys** to move. Press **1–4** to select Sevim,
  Burak, Derya or Hacer, in that order, and walk towards them.
- **Come now (E)** urgently asks the selected neighbour to follow. Repeating it
  insists; pressure can lose their trust. **Walk with me (T)** makes a gentler invitation.
- **The books (B)** asks Sevim to bundle her books if they are not ready.
  **Check the stair (R)** asks Burak to inspect it. For someone who cannot see
  the stair, **Show the stair (R)** shows it in your torchlight. Buttons are
  disabled when their action cannot help the selected person.
- **Torch (F)** switches the light on or off. Use **Show the stair** in its light so a neighbour can see the way. You walk
  more slowly with it on. Standing beside someone silently does not invite them.
- Read the selected neighbour's reply and the history of everyone's lines and arrivals.
  Lead followers down to the street. Burak can check the route and help Sevim.
- Open **≡** or press **Escape** to pause. Choose **Keep going** or press
  **Escape** to resume. Switching tabs or leaving the window also pauses play.

The run ends when everyone is safe, time runs out, or your breath runs out.
The outcome lists rescues, deaths and hospital arrivals. **Try this night again** starts
with the same seed. **Watch this run** plays back the completed run.
**Download this run** saves a JSON file from the pause menu or outcome.
**Tell us about this night** opens Feedback from the outcome.

## People and rescue rules

[Human Framework](https://human.adamwhite.work) **4.8.0** supplies each person's
state, needs, decisions, trust in your voice, and assent or refusal of requests.
Smoke supplies the offered choices and their conditions, the words shown,
movement, smoke, torchlight, time and breath limits, and rescue outcomes.
PixiJS 8 draws the stairwell. The host advances at 20 fixed steps per second;
HF uses integer milliseconds. Actions settle through the public run protocol.
Walking uses finite intervals, with HF deciding whether to continue. The host
models resident smoke exposure and caretaker breath as game hazards.

## Replay and privacy

Downloads contain the seed, timed inputs, full game state, exact HF archive,
engine version and state hash. The source's `replayRun` rebuilds Smoke from the
seed and inputs and checks the complete export. HF archive replay separately
checks the recorded HF transactions and full hash. New runs use `smoke-8` with HF 4.8.0.
Other formats require their original build; keep the file and start a fresh
night here. There is no file-import control. Diagnostics are
available in the pause menu’s collapsed **Debug** item without a query flag.
The optional `seed` query parameter selects a night; it enables no feature.

The lab client records play by default, including run snapshots and event/error
logs, and attempts uploads. Queued records are not storage receipts.
The Feedback dialog shows **Sent** only after the service confirms storage.
Received records are private and kept for 180 days. Recording can link play
across supported games in the same browser when shared identity is available.
Blocked frames, separate browsers and limited or reset storage can prevent
linking. Hosting a copy elsewhere does not guarantee uploads or linking.
Browser Do Not Track or Global Privacy Control defaults recording to off.
Use **Record this play for the game lab** in the pause menu to change it;
turning it on explicitly allows recording despite those browser signals.
Turning it off stops recording and clears queued uploads and the local player
ID; it does not delete records already received. Downloads still work.
**I'm stopping** and **I'm confused** open Feedback drafts. Review the note and
optional name before submitting. With recording off, submission attempts an
unlinked note unless you choose **Share this run and my play with the lab**;
submitting that choice also turns recording on. Sending can fail; check for
**Sent**. Character analysis requires separate opt-in.
See the [privacy notice](https://human.adamwhite.work/lab/privacy/).

## Development

Use Node **26.12.0** and pnpm **12.14.0**.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Run `pnpm check:lane` before committing. `pnpm build` builds the site;
`pnpm e2e` runs browser checks. See [the design](docs/design.md) for scope.
Code is MIT licensed.
