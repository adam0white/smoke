import {
  type Affordance,
  answerNow,
  begin,
  createPerson,
  decide,
  finish,
  tick as humanTick,
  interrupt,
  MINUTES_PER_YEAR,
  type Person,
  type SuggestionResolution,
} from '@adam0white/human-framework';

export const WORLD = { width: 360, height: 500, ground: 450, landings: [365, 280, 195, 110] } as const;
export const ENGINE = '3.2.0';
export type Input =
  | { type: 'move'; x: number; y: number }
  | { type: 'speak'; id: string; line: 'come' | 'books' | 'together' | 'route' }
  | { type: 'torch' };
export interface LoggedInput {
  tick: number;
  input: Input;
}
export interface GameEvent {
  tick: number;
  text: string;
}
export interface Resident {
  id: string;
  name: string;
  x: number;
  y: number;
  homeY: number;
  status: 'waiting' | 'following' | 'escaping' | 'helping' | 'safe' | 'hospital';
  line: string;
  action: string;
  care: number;
  booksReady: boolean;
  routeKnown: boolean;
  hf: Person;
  resolution?: SuggestionResolution;
}
export interface Game {
  tick: number;
  seed: number;
  phase: 'playing' | 'won' | 'lost';
  player: { x: number; y: number; targetX: number; targetY: number };
  people: Resident[];
  smoke: number[];
  torch: boolean;
  breath: number;
  deadline: number;
  notice: string;
  rescued: string[];
  routeFound: boolean;
  log: LoggedInput[];
  events: GameEvent[];
  lastDecisionTick: number;
}
export interface RunExport {
  format: 'smoke-1';
  engine: '3.2.0';
  seed: number;
  ticks: number;
  inputs: LoggedInput[];
  state: Game;
  hash: string;
}

const START = 370;
const baselineTraits = {
  honesty: 0.5,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};
const baselineValues = {
  benevolence: 0.5,
  universalism: 0.5,
  tradition: 0.5,
  conformity: 0.5,
  security: 0.5,
  achievement: 0.5,
  power: 0.5,
  hedonism: 0.5,
  stimulation: 0.5,
  selfDirection: 0.5,
};
const cast = [
  {
    id: 'sevim',
    name: 'Sevim',
    age: 69,
    y: 365,
    traits: { honesty: 0.6, extraversion: 0.6, agreeableness: 0.35, conscientiousness: 0.85, openness: 0.4 },
    line: 'These exercise books come with me.',
  },
  {
    id: 'burak',
    name: 'Burak',
    age: 31,
    y: 280,
    traits: { honesty: 0.8, extraversion: 0.3, agreeableness: 0.7, conscientiousness: 0.8, openness: 0.5 },
    line: 'I will check the way down.',
  },
  {
    id: 'derya',
    name: 'Derya',
    age: 44,
    y: 195,
    traits: { honesty: 0.7, extraversion: 0.35, agreeableness: 0.6, emotionality: 0.5, openness: 0.55 },
    line: 'I have just come off nights. Give me a moment.',
  },
  // Hacer is visiting the top landing, rather than importing a new permanent flat.
  {
    id: 'hacer',
    name: 'Hacer',
    age: 58,
    y: 110,
    traits: { extraversion: 0.8, agreeableness: 0.45, honesty: 0.5, emotionality: 0.6 },
    line: 'Which stair reaches the front door?',
  },
] as const;

export function createGame(seed: number): Game {
  const normalizedSeed = Number.isFinite(seed) ? seed >>> 0 : 1;
  return {
    tick: 0,
    seed: normalizedSeed,
    phase: 'playing',
    player: { x: 180, y: 450, targetX: 180, targetY: 450 },
    people: cast.map((c, i) => ({
      id: c.id,
      name: c.name,
      x: i % 2 ? 268 : 92,
      y: c.y,
      homeY: c.y,
      status: 'waiting',
      line: c.line,
      action: 'wait',
      care: 0,
      booksReady: c.id !== 'sevim',
      routeKnown: c.id === 'burak',
      hf: createPerson({
        id: `hf.cast.${c.id}.${c.id === 'hacer' ? 'voice' : 'stairwell'}`,
        name: c.name,
        seed: normalizedSeed + i + 1,
        now: START,
        bornAt: START - c.age * MINUTES_PER_YEAR,
        sex: c.id === 'burak' ? 'male' : 'female',
        traits: { ...baselineTraits, ...c.traits },
        values: { ...baselineValues },
        body: { sleepPressure: c.id === 'derya' ? 0.55 : 0.2, satiety: 0.8, hydration: 0.8 },
        needs: { safety: 0.25, meaning: 0.35, belonging: 0.45, autonomy: 0.7 },
        voices: [{ voiceId: 'player', trust: c.id === 'hacer' ? 0.35 : 0.6 }],
        lexicon: { plainEnglish: true, names: { player: 'the caretaker' } },
        enable: { suggestionReasons: true },
      }),
    })),
    smoke: [0, 0, 0, 0, 0],
    torch: false,
    breath: 0,
    deadline: 3000 + (normalizedSeed % 201),
    notice: 'Tap a landing to walk. Speak nearby. Stay to show you mean it.',
    rescued: [],
    routeFound: false,
    log: [],
    events: [],
    lastDecisionTick: -1,
  };
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const near = (g: Game, r: Resident) => distance(g.player, r) < 85;
const rounded = (n: number) => Math.round(n * 1000) / 1000;
function event(g: Game, text: string) {
  g.events.push({ tick: g.tick, text });
  g.notice = text;
}

function offer(id: string, label: string, advertises: Affordance['advertises'], effort = 0.05): Affordance {
  return { id, action: id, label, duration: 1, effort, advertises };
}

function offers(g: Game, r: Resident): Affordance[] {
  const supported = (r.id !== 'hacer' && near(g, r) && r.care >= 40) || r.routeKnown;
  const ready = r.booksReady && supported;
  const list = [
    offer(
      'wait',
      r.id === 'sevim' && !r.booksReady ? 'keep the books together' : 'wait by the familiar door',
      { safety: 0.65, autonomy: 0.15, meaning: r.booksReady ? 0 : 0.7 },
    ),
    offer('rest', 'catch my breath', { rest: 0.15 }),
    offer(
      'follow',
      'walk downstairs with the caretaker',
      { safety: ready && near(g, r) ? 0.95 : 0.08, belonging: ready && near(g, r) ? 0.5 : 0.02 },
      0.12,
    ),
  ];
  if (r.booksReady && r.routeKnown && (r.id !== 'burak' || g.routeFound))
    list.push(offer('escape', 'take the known stair to the front door', { safety: 0.9 }, 0.1));
  if (r.id === 'sevim' && !r.booksReady)
    list.push(
      offer('books', 'secure the exercise books together', {
        meaning: 0.9,
        safety: near(g, r) || g.routeFound ? 0.65 : 0.02,
        belonging: 0.2,
      }),
    );
  if (r.id === 'burak' && !g.routeFound)
    list.push(offer('route', 'check the front stair and come back', { safety: 1, competence: 0.4 }, 0.1));
  if (r.id === 'burak' && g.routeFound && !g.people[0]!.booksReady)
    list.push(offer('help', 'help Sevim with the books', { safety: 0.9, meaning: 0.7, belonging: 0.5 }, 0.1));
  return list;
}

function applyChoice(r: Resident, choice: string) {
  r.action = choice;
  if (choice === 'follow') {
    r.status = 'following';
    r.line = 'Stay where I can see you. I am coming.';
  } else if (choice === 'escape') {
    r.status = 'escaping';
    r.line = 'I know the way now. Meet me outside.';
  } else if (choice === 'help') {
    r.status = 'helping';
    r.line = 'Sevim, I can hold that stack while you tie it.';
  } else if (choice === 'route') {
    r.status = 'helping';
    r.line = 'I will check the front stair. Wait for my word.';
  } else if (choice === 'books') {
    r.status = 'waiting';
    r.line = 'Hold these steady. I can tie them in one bundle.';
  }
}

function choose(
  g: Game,
  r: Resident,
  suggestion?: { voiceId: string; affordanceId: string; strength: number },
) {
  if (g.lastDecisionTick === g.tick) return;
  g.lastDecisionTick = g.tick;
  const available = offers(g, r);
  if (suggestion) {
    const answer = answerNow(r.hf, available, suggestion);
    r.resolution = answer.resolution;
    if (answer.booked) {
      r.line = refusal(r);
      event(g, `${r.name}: ${r.line}`);
      return;
    }
  }
  if (r.hf.activity) {
    interrupt(r.hf, r.hf.now, suggestion ? 'a neighbour speaks' : 'the stair changes');
    finish(r.hf, {
      affordanceId: r.hf.activity.affordanceId,
      action: r.hf.activity.action,
      status: 'interrupted',
      at: r.hf.now,
    });
  }
  const record = decide(r.hf, available, suggestion ? { suggestion } : {});
  const picked = available.find((a) => a.id === record.chosenAffordanceId);
  if (record.suggestion) r.resolution = record.suggestion;
  if (picked) {
    begin(r.hf, picked, record);
    applyChoice(r, picked.id);
  }
  if (suggestion && record.suggestion?.verdict !== 'assented') r.line = refusal(r);
  if (suggestion) event(g, `${r.name}: ${r.line}`);
}

function refusal(r: Resident): string {
  if (r.resolution?.reason === 'distrust')
    return 'You keep pushing. I need to see a clear way, not hear it again.';
  if (r.id === 'sevim' && !r.booksReady) return 'Not without the books. Stay and help me bundle them.';
  if (r.id === 'hacer' && !r.routeKnown) return 'I cannot see where that stair goes. Show me with the torch.';
  if (r.id === 'derya' && r.care < 40) return 'Wait beside me a moment. I need to get my bearings.';
  return r.resolution?.says ?? 'Give me a moment.';
}

function approach(p: { x: number; y: number }, x: number, y: number, speed: number) {
  // Landing entry is horizontal. All floor changes use the central stair.
  if (Math.abs(p.y - y) > 1 && Math.abs(p.x - 180) > 1) x = 180;
  else if (Math.abs(p.y - y) > 1) x = 180;
  const moveX = Math.abs(p.x - x) > 0.01;
  if (moveX) p.x = rounded(p.x + Math.sign(x - p.x) * Math.min(Math.abs(x - p.x), speed));
  else p.y = rounded(p.y + Math.sign(y - p.y) * Math.min(Math.abs(y - p.y), speed));
}

function speak(g: Game, input: Extract<Input, { type: 'speak' }>) {
  const r = g.people.find((p) => p.id === input.id);
  if (!r || r.status === 'safe' || r.status === 'hospital') return;
  if (!near(g, r)) {
    g.notice = `Walk closer to ${r.name} so they can hear you.`;
    return;
  }
  const id =
    input.line === 'books' && r.id === 'sevim' && !r.booksReady
      ? 'books'
      : input.line === 'route' && r.id === 'burak' && !g.routeFound
        ? 'route'
        : 'follow';
  choose(g, r, { voiceId: 'player', affordanceId: id, strength: input.line === 'come' ? 0.9 : 0.55 });
}

export function step(g: Game, input?: Input): void {
  if (g.phase !== 'playing') return;
  g.tick++;
  if (input) {
    g.log.push({ tick: g.tick, input: structuredClone(input) });
    if (input.type === 'move' && Number.isFinite(input.x) && Number.isFinite(input.y)) {
      g.player.targetX = Math.max(55, Math.min(305, input.x));
      g.player.targetY = [450, ...WORLD.landings].reduce((a, b) =>
        Math.abs(b - input.y) < Math.abs(a - input.y) ? b : a,
      );
    } else if (input.type === 'torch') g.torch = !g.torch;
    else if (input.type === 'speak') speak(g, input);
  }
  const seconds = g.tick / 20;
  const wave = ((g.tick + (g.seed % 80)) % 320) / 320;
  const pulse = wave < 0.55 ? 0.18 : 0.8;
  g.smoke = [0, 1, 2, 3, 4].map((f) =>
    f === 0 ? 0 : rounded(Math.min(0.94, Math.max(0, (seconds - 12) / 200) + (pulse * f) / 4)),
  );
  const floor = Math.max(0, Math.min(4, Math.round((450 - g.player.y) / 85)));
  const density = g.smoke[floor]!;
  approach(g.player, g.player.targetX, g.player.targetY, (g.torch ? 1.9 : 2.4) * (density > 0.65 ? 0.6 : 1));
  g.breath =
    Math.round(Math.max(0, Math.min(1, g.breath + (floor ? density * 0.00024 : -0.0018))) * 1e6) / 1e6;
  if (g.tick % 1200 === 0) for (const r of g.people) humanTick(r.hf, START + g.tick / 1200);
  for (const r of g.people) {
    if (r.status === 'safe' || r.status === 'hospital') continue;
    if (near(g, r)) {
      r.care++;
      if (g.torch && r.care >= 40 && !r.routeKnown) {
        r.routeKnown = true;
        event(g, `${r.name} can see the stair in your torchlight.`);
      }
      if (r.id === 'derya' && r.care === 40) {
        r.routeKnown = true;
        r.line = 'All right. I can stand. Let us go.';
      }
    }
    if (r.id === 'sevim' && !r.booksReady && r.care >= 120) {
      r.booksReady = true;
      r.routeKnown = true;
      event(g, 'Sevim: The bundle is tied. I can take it myself.');
    }
    if (r.status === 'helping' && r.action === 'route') {
      approach(r, 180, 450, 1.8);
      if (r.y >= 449) {
        g.routeFound = true;
        r.routeKnown = true;
        r.status = 'waiting';
        event(g, 'Burak: The front stair is clear between the dark waves. I am coming back for Sevim.');
        choose(g, r);
      }
    } else if (r.status === 'helping' && r.action === 'help') {
      const sevim = g.people[0]!;
      approach(r, sevim.x, sevim.y, 1.8);
      if (distance(r, sevim) < 8) {
        sevim.care++;
        if (sevim.booksReady) {
          r.status = 'waiting';
          choose(g, r);
        }
      }
    } else if (r.status === 'following') {
      if (distance(r, g.player) > 24 || g.player.y >= 435) approach(r, g.player.x, g.player.y, 1.7);
    } else if (r.status === 'escaping') approach(r, 180, 450, 1.7);
    if ((r.status === 'following' || r.status === 'escaping') && r.y >= 435) {
      r.status = 'safe';
      r.line =
        r.id === 'sevim'
          ? 'The books are with me. I am outside.'
          : r.id === 'burak'
            ? g.rescued.includes('sevim')
              ? 'Sevim is out. The front stair was clear.'
              : 'I am outside. I checked the front stair.'
            : r.id === 'derya'
              ? 'Outside. I need to sit for a moment.'
              : 'That was the right stair. I know it now.';
      g.rescued.push(r.id);
      event(g, `${r.name} reached the front door.`);
      if (r.hf.activity)
        finish(r.hf, {
          affordanceId: r.hf.activity.affordanceId,
          action: r.hf.activity.action,
          status: 'completed',
          at: r.hf.now,
          needs: { safety: 0.9 },
          summary: 'Reached the front door safely.',
        });
    }
  }
  // Stagger autonomous decisions: at most one resident per fixed tick.
  const slot = g.tick % 40;
  if (slot < g.people.length) {
    const r = g.people[slot]!;
    if (r.status === 'waiting') choose(g, r);
  }
  if (g.rescued.length === g.people.length) {
    g.phase = 'won';
    event(g, 'Everyone reached the front door. All four are safe.');
  } else if (g.tick >= g.deadline || g.breath >= 1) {
    g.phase = 'lost';
    for (const r of g.people)
      if (r.status !== 'safe') {
        r.status = 'hospital';
        r.line = 'Firefighters brought me out. I am being checked at hospital.';
      }
    event(
      g,
      `${g.rescued.length} reached the door with you. Firefighters brought the others out. No one died.`,
    );
  } else if (g.tick === 1600) event(g, 'The smoke stays longer now. Cross while it thins.');
  else if (g.tick === 2400) event(g, 'The upper stair is nearly closed. There is little time left.');
}

export function stateHash(g: Game): string {
  let h = 2166136261;
  const text = JSON.stringify(g);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function exportRun(g: Game): RunExport {
  return {
    format: 'smoke-1',
    engine: ENGINE,
    seed: g.seed,
    ticks: g.tick,
    inputs: structuredClone(g.log),
    state: structuredClone(g),
    hash: stateHash(g),
  };
}
export function replayRun(run: RunExport): Game {
  if (run.format !== 'smoke-1' || run.engine !== ENGINE) throw new Error('Unsupported Smoke replay version.');
  if (!Number.isInteger(run.ticks) || run.ticks < 0 || run.ticks > 4000)
    throw new Error('Invalid replay length.');
  const g = createGame(run.seed);
  let index = 0;
  for (let t = 1; t <= run.ticks; t++) {
    const logged = run.inputs[index];
    if (logged && logged.tick < t) throw new Error('Replay inputs are out of order.');
    step(g, logged?.tick === t ? run.inputs[index++]!.input : undefined);
  }
  if (index !== run.inputs.length || stateHash(g) !== run.hash || stateHash(run.state) !== run.hash)
    throw new Error('Replay hash mismatch.');
  return g;
}
