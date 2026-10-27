import 'pixi.js/unsafe-eval';
import { claimLabNotice, createLab } from '@adam0white/lab-client';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { readOutcome, readScreen } from './screen';
import {
  canSpeak,
  createGame,
  exportRun,
  type Input,
  type RunExport,
  replayRun,
  stateHash,
  step,
} from './sim';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<header><div class="brand">Lale Apartmanı · Istanbul<strong>Smoke on the Stairs</strong></div><button class="plain" id="menu" aria-label="Pause and open menu">≡</button></header><main class="stage"><aside class="stage-note"><b>06:10 · Istanbul</b>Find who is home.<br>Show them the stair.<br>Ask them to leave.</aside><div class="scene" id="scene" role="img" aria-label="Apartment stairwell. Tap a landing to walk. Tap a neighbour to select them."></div></main><section class="controls" aria-label="Neighbour and action controls"><p id="smoke-clock" class="smoke-clock" role="timer"></p><div class="event-feed" id="event-feed" role="log" aria-label="What everyone says and does" aria-live="polite" aria-relevant="additions"><ol id="events"></ol></div><p class="dialogue" id="line"></p><div class="people" id="people"></div><div class="actions"><button data-action="come">Come now<small>E</small></button><button data-action="books">The books<small>B</small></button><button data-action="together">Walk with me<small>T</small></button><button data-action="route">Show the stair<small>R</small></button><button data-action="torch">Torch<small>F</small></button></div><div class="walk"><button id="street">Street</button><p id="guidance" class="hint"></p></div><div class="sr-only" id="landings" aria-label="Walk to a landing"></div></section><div class="veil" id="overlay"></div>`;
const lab = createLab({ game: 'smoke' });
const requestedSeed = new URLSearchParams(location.search).get('seed');
let game = createGame(
  new URLSearchParams(location.search).has('lab') && requestedSeed !== null
    ? Number(requestedSeed)
    : crypto.getRandomValues(new Uint32Array(1))[0]!,
);
let previous = game.people.map((p) => ({ x: p.x, y: p.y }));
let previousPlayer = { ...game.player };
let selected = game.people[0]!.id;
let started = false,
  paused = true,
  replaying = false,
  ended = false;
let accumulator = 0,
  lastFrame = 0;
let replay: RunExport | null = null;
let attempt = 0;
const pending: Input[] = [];
const keys = new Set<string>();
const labMode = new URLSearchParams(location.search).has('lab');
const frameSamples: number[] = [];
let frameStart = 0;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const line = document.querySelector<HTMLParagraphElement>('#line')!;
const eventList = document.querySelector<HTMLOListElement>('#events')!;
const eventFeed = document.querySelector<HTMLDivElement>('#event-feed')!;
let eventCursor = 0;
let lastDOMKey = '';
const people = document.querySelector<HTMLDivElement>('#people')!;
const menuButton = document.querySelector<HTMLButtonElement>('#menu')!;
const landings = [450, 365, 280, 195, 110];
const ink = 0x202521,
  paper = 0xeee8d8,
  coral = 0xde795d,
  amber = 0xedba65;
const pixi = new Application();
await pixi.init({
  width: 360,
  height: 500,
  antialias: true,
  backgroundAlpha: 0,
  resolution: Math.min(devicePixelRatio, 2),
  autoDensity: true,
  preference: 'webgl',
});
const scene = document.querySelector<HTMLDivElement>('#scene')!;
scene.append(pixi.canvas);
// autoDensity sets pixel styles; the layout must keep control of the CSS size.
pixi.canvas.style.width = '100%';
pixi.canvas.style.height = '100%';
pixi.canvas.setAttribute('aria-hidden', 'true');
const building = new Graphics();
building.poly([38, 43, 317, 35, 326, 455, 34, 455]).fill(paper);
building.poly([38, 43, 53, 53, 49, 455, 34, 455]).fill(0xbcbbaa);
building.poly([317, 35, 331, 48, 337, 448, 326, 455]).fill(0x999e90);
building.rect(62, 65, 237, 357).fill(0xd4d3bf);
// The folded central stair is one continuous route, with rooms opening off it.
for (let floor = 0; floor < 4; floor++) {
  const y = landings[floor + 1]!;
  building.rect(51, y + 1, 262, 8).fill(ink);
  building.poly([167, y + 8, 207, y + 8, 207, y + 85, 167, y + 85]).fill(0xbbbda9);
  for (let s = 0; s < 8; s++) building.rect(169, y + 10 + s * 9, 38, 2).fill(0x777f6e);
  building
    .moveTo(165, y + 8)
    .lineTo(165, y + 85)
    .stroke({ color: ink, width: 2 });
  const left = floor % 2 === 0,
    x = left ? 70 : 255;
  building.rect(x, y - 52, 32, 52).fill(0x586451);
  building.poly([x + 3, y - 49, x + 27, y - 45, x + 27, y, x + 3, y]).fill(0x6f7a62);
  building.circle(x + 23, y - 23, 1.5).fill(amber);
  const n = new Text({
    text: ['3', '2', '5', '7'][floor],
    style: { fontFamily: 'Georgia', fontSize: 9, fill: paper },
  });
  n.position.set(x + 12, y - 43);
  pixi.stage.addChild(n);
}
building.rect(143, 411, 77, 39).fill(ink);
building.poly([153, 419, 211, 419, 211, 450, 153, 450]).fill(0xc6cba9);
building.rect(27, 451, 315, 7).fill(paper);
building.poly([47, 464, 314, 464, 332, 474, 25, 474]).fill(0x101b17);
pixi.stage.addChildAt(building, 0);
function label(text: string, x: number, y: number, size: number, color = ink) {
  const t = new Text({
    text,
    style: { fontFamily: 'Georgia', fontSize: size, fill: color, letterSpacing: 1 },
  });
  t.position.set(x, y);
  pixi.stage.addChild(t);
  return t;
}
label('LALE APARTMANI', 107, 19, 10, paper);
label('SOKAK / STREET', 122, 480, 8, 0xa7ae9b);
const smoke = new Graphics();
pixi.stage.addChild(smoke);
const torch = new Graphics();
pixi.stage.addChild(torch);
const actorLayer = new Container();
pixi.stage.addChild(actorLayer);
const figures = game.people.map((p, i) => {
  const c = new Container(),
    g = new Graphics();
  const colors = [coral, 0x9d865d, 0x698775, 0xa8ab90];
  g.poly([-7, -24, 5, -26, 9, -6, -8, -5]).fill(colors[i % 4]!);
  g.circle(0, -31, 5).fill(ink);
  g.moveTo(-4, -6).lineTo(-5, 0).moveTo(4, -6).lineTo(6, 0).stroke({ width: 3, color: ink });
  g.moveTo(-5, -21).lineTo(-11, -12).moveTo(5, -21).lineTo(12, -17).stroke({ width: 3, color: ink });
  c.addChild(g);
  const name = new Text({
    text: p.name,
    style: {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 16,
      fontWeight: '700',
      fill: ink,
      stroke: { color: paper, width: 4 },
    },
  });
  name.anchor.set(0.5, 0);
  name.position.set(0, 4);
  c.addChild(name);
  const ring = new Graphics();
  c.addChildAt(ring, 0);
  actorLayer.addChild(c);
  return { c, g, ring, name };
});
const caretaker = new Container(),
  body = new Graphics();
body.poly([-6, -23, 5, -24, 8, -5, -7, -5]).fill(ink);
body.circle(0, -30, 5).fill(ink);
body.moveTo(-4, -5).lineTo(-6, 0).moveTo(4, -5).lineTo(7, 0).stroke({ width: 3, color: ink });
body.moveTo(5, -20).lineTo(13, -16).stroke({ width: 3, color: ink });
body.circle(14, -16, 2).fill(amber);
caretaker.addChild(body);
actorLayer.addChild(caretaker);
const breathEdge = new Graphics();
pixi.stage.addChild(breathEdge);
const status = label('TAP A LANDING TO WALK', 80, 57, 8, 0x586451);

function setPaused(value: boolean) {
  paused = value;
  keys.clear();
  pending.length = 0;
  accumulator = 0;
  lastFrame = 0;
  updateDOM();
}
function enqueue(input: Input) {
  if (started && !paused && game.phase === 'playing' && !replaying) pending.push(input);
}
function speak(action: string) {
  if (action === 'torch') enqueue({ type: 'torch' });
  else if (canSpeak(game, selected, action as 'come'))
    enqueue({ type: 'speak', id: selected, line: action as 'come' });
}
function select(id: string) {
  const p = game.people.find((p) => p.id === id);
  if (!p?.atHome) return;
  selected = id;
  if (p && p.status !== 'safe' && p.status !== 'hospital' && p.status !== 'dead')
    enqueue({ type: 'move', x: p.x, y: p.y });
  updateDOM();
}
function updateDOM() {
  const screen = readScreen(game, selected);
  const clock = document.querySelector<HTMLElement>('#smoke-clock')!;
  if (clock.textContent !== screen.timer) clock.textContent = screen.timer;
  // Walking changes positions every step, but DOM controls change only at
  // speaking range boundaries or after an event. Avoid rebuilding button text
  // and forcing layout on every 20 Hz simulation step.
  const domKey = JSON.stringify([
    started,
    paused,
    replaying,
    selected,
    game.phase,
    game.torch,
    game.events.length,
    screen,
    game.people.map((p) => [
      p.line,
      p.status,
      p.atHome,
      p.asleep,
      ...(['come', 'books', 'together', 'route'] as const).map((action) => canSpeak(game, p.id, action)),
    ]),
  ]);
  if (domKey === lastDOMKey) return;
  lastDOMKey = domKey;
  document.querySelector<HTMLElement>('#guidance')!.textContent = screen.guidance;
  const p = game.people.find((p) => p.id === selected)!;
  const message = p.atHome ? `${p.name}: ${screen.dialogue}` : `${p.name} is away tonight.`;
  if (line.textContent !== message) line.textContent = message;
  const followingLatest = eventFeed.scrollHeight - eventFeed.scrollTop - eventFeed.clientHeight < 30;
  while (eventCursor < game.events.length) {
    const entry = game.events[eventCursor++]!;
    const li = document.createElement('li');
    li.textContent = entry.text;
    li.dataset.tick = String(entry.tick);
    eventList.append(li);
  }
  if (followingLatest) eventFeed.scrollTop = eventFeed.scrollHeight;
  for (const button of people.querySelectorAll('button')) {
    const resident = game.people.find((person) => person.id === button.dataset.id)!;
    button.classList.toggle('active', button.dataset.id === selected);
    button.setAttribute('aria-pressed', String(button.dataset.id === selected));
    const visible = screen.people.find((p) => p.id === resident.id)!;
    button.replaceChildren();
    const name = document.createElement('span');
    name.textContent = `${game.people.indexOf(resident) + 1} ${resident.name}`;
    const state = document.createElement('small');
    state.textContent = visible.status;
    button.append(name, state);
    button.disabled = !resident.atHome;
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    const action = button.dataset.action!;
    button.disabled =
      !started ||
      paused ||
      replaying ||
      game.phase !== 'playing' ||
      (action !== 'torch' && !canSpeak(game, selected, action as 'come'));
    button.title = button.disabled && action !== 'torch' ? 'Approach a neighbour who needs this action.' : '';
  }
  const routeButton = document.querySelector<HTMLButtonElement>('[data-action="route"]')!;
  routeButton.firstChild!.textContent =
    p.id === 'burak' && !game.routeFound ? 'Check the stair' : 'Show the stair';
  const tb = document.querySelector<HTMLButtonElement>('[data-action="torch"]')!;
  tb.setAttribute('aria-pressed', String(game.torch));
}
for (const [i, p] of game.people.entries()) {
  const b = document.createElement('button');
  b.textContent = `${i + 1} ${p.name}`;
  b.dataset.id = p.id;
  b.onclick = () => select(p.id);
  people.append(b);
}
for (const [i, y] of landings.entries()) {
  const b = document.createElement('button');
  b.textContent = i ? `Walk to landing ${i}` : 'Walk to the street';
  b.onclick = () => enqueue({ type: 'move', x: 180, y });
  document.querySelector('#landings')!.append(b);
}
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) => {
  b.onclick = () => speak(b.dataset.action!);
});
pixi.canvas.addEventListener('pointerdown', (e) => {
  const r = pixi.canvas.getBoundingClientRect(),
    x = ((e.clientX - r.left) * 360) / r.width,
    y = ((e.clientY - r.top) * 500) / r.height;
  const near = game.people.find(
    (p) =>
      p.status !== 'safe' &&
      p.status !== 'hospital' &&
      p.status !== 'dead' &&
      Math.hypot(p.x - x, p.y - 17 - y) < 27,
  );
  if (near) select(near.id);
  else
    enqueue({ type: 'move', x, y: landings.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a)) });
});
function showSheet(content: string) {
  overlay.hidden = false;
  overlay.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${content}</section>`;
  setPaused(true);
  queueMicrotask(() => overlay.querySelector<HTMLButtonElement>('button')?.focus());
}
function hideSheet() {
  overlay.hidden = true;
  setPaused(false);
  menuButton.focus();
}
function download() {
  const blob = new Blob([JSON.stringify(exportRun(game), null, 2)], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `smoke-${game.seed}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function feedback(note: string) {
  lab.openSendDialog({ note, getRun: () => exportRun(game), feedbackChoices: true });
}
function showMenu() {
  showSheet(
    `<div class="eyebrow">The night is paused</div><h2 id="sheet-title">Paused.</h2><button class="primary" id="resume">Keep going</button><button class="secondary" id="new-game">New game</button><div id="new-confirm" hidden><p>Start a new night? This ends the current night.</p><button class="secondary" id="confirm-new">Start new night</button><button class="secondary" id="cancel-new">Keep this night</button></div><button class="secondary" id="fullscreen">Full screen</button><a class="secondary" href="https://human.adamwhite.work/games/">All games</a><button class="secondary" id="stopping">I'm stopping</button><button class="secondary" id="confused">I'm confused</button><button class="secondary" id="export">Download this run</button><label><input id="recording" type="checkbox" ${lab.telemetryOn ? 'checked' : ''}>Record this play for the game lab</label><p class="minor">Recorded play is linked to other lab play on this device and kept for 180 days. <a href="https://human.adamwhite.work/lab/privacy/" target="_blank" rel="noopener noreferrer">Privacy</a></p><p class="minor">Feedback opens a draft for you to review. Nothing is sent until you submit.</p>`,
  );
  document.querySelector('#new-game')!.addEventListener('click', () => {
    document.querySelector<HTMLElement>('#new-confirm')!.hidden = false;
    document.querySelector<HTMLButtonElement>('#confirm-new')!.focus();
  });
  document.querySelector('#confirm-new')!.addEventListener('click', () => restart(true));
  document.querySelector('#cancel-new')!.addEventListener('click', () => {
    document.querySelector<HTMLElement>('#new-confirm')!.hidden = true;
    document.querySelector<HTMLButtonElement>('#new-game')!.focus();
  });
  const fullScreen = document.querySelector<HTMLButtonElement>('#fullscreen')!;
  fullScreen.disabled = !document.fullscreenEnabled;
  fullScreen.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });
  document.querySelector('#resume')!.addEventListener('click', hideSheet);
  document.querySelector('#stopping')!.addEventListener('click', () => feedback("I'm stopping"));
  document.querySelector('#confused')!.addEventListener('click', () => feedback("I'm confused"));
  document.querySelector('#export')!.addEventListener('click', download);
  document.querySelector<HTMLInputElement>('#recording')!.onchange = (e) =>
    lab.setTelemetryOff(!(e.target as HTMLInputElement).checked);
}
menuButton.onclick = showMenu;
document.querySelector<HTMLButtonElement>('#street')!.onclick = () =>
  enqueue({ type: 'move', x: 180, y: 450 });
function restart(newSeed = false) {
  attempt++;
  game = createGame(newSeed ? crypto.getRandomValues(new Uint32Array(1))[0]! : game.seed);
  resetEvents();
  previous = game.people.map((p) => ({ x: p.x, y: p.y }));
  previousPlayer = { ...game.player };
  pending.length = 0;
  ended = false;
  replaying = false;
  replay = null;
  hideSheet();
  lab.screen('stairwell');
}
function resetEvents() {
  lastDOMKey = '';
  eventCursor = 0;
  eventList.replaceChildren();
  selected = game.people.find((p) => p.atHome)?.id ?? game.people[0]!.id;
}
function showEnd() {
  ended = true;
  lab.screen('outcome');
  const outcome = readOutcome(game);
  showSheet(
    `<div class="eyebrow">${replaying ? 'Replay · ' : ''}The street, after the fire</div><h1 id="sheet-title">${outcome.heading}</h1><ol>${outcome.lines.map((line) => `<li>${line}</li>`).join('')}</ol><p class="minor">This night changes no other game. Try another order and see what they choose.</p><button class="primary" id="again">Try this night again</button>${replaying ? '' : '<button class="secondary" id="replay">Watch this run</button>'}<button class="secondary" id="end-export">Download this run</button><button class="secondary" id="end-feedback">Tell us about this night</button>`,
  );
  document.querySelector('#again')!.addEventListener('click', () => restart());
  document.querySelector('#replay')?.addEventListener('click', () => {
    replay = exportRun(game);
    attempt++;
    game = createGame(replay.seed);
    resetEvents();
    previous = game.people.map((p) => ({ x: p.x, y: p.y }));
    previousPlayer = { ...game.player };
    pending.length = 0;
    replaying = true;
    ended = false;
    hideSheet();
    lab.screen('replay');
  });
  document.querySelector('#end-export')!.addEventListener('click', download);
  document.querySelector('#end-feedback')!.addEventListener('click', () => feedback(''));
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && !overlay.hidden && overlay.contains(document.activeElement)) {
    const f = Array.from(overlay.querySelectorAll<HTMLElement>('button,input,a[href]'));
    if (!f.length) return;
    const first = f[0]!,
      last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (started && !ended) {
      if (overlay.hidden) showMenu();
      else hideSheet();
    }
    return;
  }
  if (paused || !started || ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
    keys.add(k);
  }
  if (e.repeat) return;
  const n = Number(k) - 1;
  if (n >= 0 && n < game.people.length) {
    select(game.people[n]!.id);
    return;
  }
  const action: Record<string, string> = { e: 'come', b: 'books', t: 'together', r: 'route', f: 'torch' };
  if (action[k]) {
    e.preventDefault();
    speak(action[k]);
  }
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  if (started && !paused && !ended) showMenu();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && !paused && !ended) showMenu();
  accumulator = 0;
  lastFrame = 0;
});
pixi.canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  showSheet(
    '<div class="eyebrow">Drawing paused</div><h2 id="sheet-title">The picture was interrupted.</h2><p>Your browser released the drawing surface. Download this run, then reload to try again.</p><button class="primary" id="recover">Reload</button><button class="secondary" id="recover-export">Download this run</button>',
  );
  document.querySelector('#recover')!.addEventListener('click', () => location.reload());
  document.querySelector('#recover-export')!.addEventListener('click', download);
});
function advance() {
  previous = game.people.map((p) => ({ x: p.x, y: p.y }));
  previousPlayer = { ...game.player };
  const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')),
    dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  const input = replaying
    ? replay?.inputs.find((entry) => entry.tick === game.tick + 1)?.input
    : (pending.shift() ??
      (dx || dy
        ? { type: 'move' as const, x: game.player.x + dx * 30, y: game.player.y + dy * 85 }
        : undefined));
  step(game, input);
  updateDOM();
  if (game.phase !== 'playing' && !ended) showEnd();
}
function draw(alpha: number, time: number) {
  smoke.clear();
  for (let f = 1; f < 5; f++) {
    const density = game.smoke[f] || 0;
    for (let j = 0; j < 7; j++) {
      const x = 60 + j * 39 + Math.sin(time * 0.0003 + j + f) * 9,
        y = landings[f]! - 19 - Math.cos(time * 0.0004 + j) * 7;
      smoke
        .ellipse(x, y, 39, 15 + (j % 3) * 4)
        .fill({ color: 0x556052, alpha: Math.min(0.7, density * 0.65) });
    }
  }
  torch.clear();
  const px = previousPlayer.x + (game.player.x - previousPlayer.x) * alpha,
    py = previousPlayer.y + (game.player.y - previousPlayer.y) * alpha;
  if (game.torch)
    torch.poly([px + 12, py - 17, px - 38, py - 123, px + 89, py - 105]).fill({ color: amber, alpha: 0.22 });
  caretaker.position.set(px, py);
  caretaker.rotation = Math.sin(time * 0.012) * 0.018;
  game.people.forEach((p, i) => {
    const f = figures[i]!,
      old = previous[i] || p;
    f.c.visible = p.atHome && p.status !== 'safe' && p.status !== 'hospital' && p.status !== 'dead';
    f.c.position.set(old.x + (p.x - old.x) * alpha, old.y + (p.y - old.y) * alpha);
    f.ring.clear();
    if (p.id === selected) f.ring.ellipse(0, 0, 15, 4).stroke({ color: coral, width: 1.5 });
    f.c.rotation =
      p.status === 'following' || p.status === 'escaping' ? Math.sin(time * 0.01 + i) * 0.035 : 0;
  });
  // Stack labels only when their screen rectangles would overlap.
  const placed: { x: number; y: number; width: number }[] = [];
  for (const figure of figures) {
    if (!figure.c.visible) continue;
    const width = figure.name.width;
    const x = Math.max(width / 2 + 4, Math.min(356 - width / 2, figure.c.x));
    let y = figure.c.y + 5;
    while (
      placed.some(
        (other) => Math.abs(other.x - x) < (other.width + width) / 2 + 4 && Math.abs(other.y - y) < 17,
      )
    )
      y += 18;
    figure.name.position.set(x - figure.c.x, y - figure.c.y);
    placed.push({ x, y, width });
  }
  breathEdge.clear();
  if (game.breath > 0.25)
    breathEdge
      .rect(0, 0, 360, 500)
      .stroke({ width: 15 + game.breath * 20, color: 0x6c4536, alpha: game.breath * 0.3 });
  const waveSeconds = Math.ceil(game.nextWaveTicks / 20);
  status.text =
    game.breath > 0.65
      ? 'BREATH RUNNING LOW\nGO DOWN TO THE STREET'
      : game.wave === 'thick'
        ? `THICK SMOKE · WAIT ON A LANDING\nTHINS IN ${waveSeconds} SECONDS`
        : `SMOKE THINS · MOVE DOWN THE STAIR\nTHICKENS IN ${waveSeconds} SECONDS`;
}
if (labMode)
  pixi.ticker.add(
    () => {
      frameStart = performance.now();
    },
    undefined,
    50,
  );
pixi.ticker.add(() => {
  const now = performance.now();
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(now - lastFrame, 100);
  lastFrame = now;
  if (started && !paused) {
    accumulator += dt;
    while (accumulator >= 50 && !paused) {
      advance();
      accumulator -= 50;
    }
  }
  draw(paused ? 1 : accumulator / 50, now);
});
if (labMode)
  pixi.ticker.add(
    () => {
      frameSamples.push(performance.now() - frameStart);
      if (frameSamples.length > 240) frameSamples.shift();
    },
    undefined,
    -50,
  );
lab.trackRun(() => ({ ...exportRun(game), playback: replaying }), {
  runKey: () => `${attempt}:${replaying ? 'playback' : 'play'}`,
});
resetEvents();
let showNotice = await claimLabNotice();
try {
  const key = 'smoke-notice-v1';
  showNotice &&= localStorage.getItem(key) !== '1';
  localStorage.setItem(key, '1');
} catch {
  /* Blocked storage keeps the disclosure visible. */
}

showSheet(
  `<div class="eyebrow">Lale Apartmanı · a block of flats in Istanbul</div><h1 id="sheet-title">Smoke on<br>the Stairs.</h1><p class="intro">Smoke is filling the stair.<br>Get everyone who is home to the street.</p><p>Tap a neighbour to approach. Show the stair with your torch. Choose what to say, and listen to their answer. When someone is following, tap Street to lead them down. Their name shows whether they are following or stopped.</p><p class="minor">Tap a landing to walk. Keyboard: arrows / WASD to move, 1–4 to select. Speech keys appear on the buttons.</p><button class="primary" id="start">Enter the stairwell →</button>${showNotice ? '<p class="minor">The game lab records play, links it to other lab play on this device, and keeps it for 180 days. Turn recording off in the pause menu. Feedback is yours to review before sending. <a href="https://human.adamwhite.work/lab/privacy/" target="_blank" rel="noopener noreferrer">Privacy</a></p>' : ''}<p class="minor">People left inside may die. This night changes no other game.</p>`,
);
document.querySelector('#start')!.addEventListener('click', () => {
  started = true;
  hideSheet();
  lab.screen('stairwell');
  updateDOM();
});
if (labMode)
  Object.assign(window, {
    smoke: {
      getState: () => game,
      enqueue: (input: Input) => {
        pending.push(input);
      },
      exportRun: () => exportRun(game),
      frameTimes: () => [...frameSamples],
      replayCheck: () => stateHash(replayRun(exportRun(game))),
      advance: (ticks = 1) => {
        for (let n = 0; n < ticks && game.phase === 'playing'; n++) advance();
        return game;
      },
    },
  });
updateDOM();
