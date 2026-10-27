import {
  type Affordance,
  answerNow,
  begin,
  createPerson,
  credence,
  decide,
  finish,
  tick as humanTick,
  interrupt,
  MINUTES_PER_YEAR,
  type Person,
  perceive,
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
  status: 'waiting' | 'following' | 'escaping' | 'helping' | 'safe' | 'hospital' | 'dead';
  smokeExposure: number;
  smokeTolerance: number;
  exitMethod?: 'escorted' | 'alone';
  line: string;
  action: string;
  atHome: boolean;
  asleep: boolean;
  holdingBack: boolean;
  taskTicks: number;
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
  smokeOrigin: number;
  wave: 'thin' | 'thick';
  nextWaveTicks: number;
  hfTicks: number;
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
  format: 'smoke-5';
  engine: '3.2.0';
  seed: number;
  ticks: number;
  inputs: LoggedInput[];
  state: Game;
  hash: string;
}

const START = 370;
/** Sevim's exit line when she leaves before the bundle is tied. The outcome reads it,
 * because Burak may still finish the bundle after she is outside. */
export const SEVIM_LEFT_BOOKS = 'I left the books behind. I am outside.';
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
    line: 'I cannot see the stair to the front door.',
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
      status: i === normalizedSeed % 5 ? 'safe' : 'waiting',
      atHome: i !== normalizedSeed % 5,
      asleep: i === (normalizedSeed >>> 1) % 4,
      holdingBack: i === (normalizedSeed + 1) % 4,
      taskTicks: 0,
      smokeExposure: 0,
      // Fixed per night and person. Early evacuation stays viable; waiting through
      // repeated smoke waves can be fatal. No random draw occurs during play.
      smokeTolerance:
        850 + ((Math.imul(normalizedSeed ^ Math.imul(i + 1, 0x9e3779b9), 0x85ebca6b) >>> 0) % 351),
      line:
        i === normalizedSeed % 5
          ? 'Away tonight.'
          : i === (normalizedSeed >>> 1) % 4
            ? 'I was asleep. Speak to me so I know who is there.'
            : c.line,
      action: 'wait',
      booksReady: c.id !== 'sevim',
      routeKnown: c.id === 'burak',
      hf: createPerson({
        id: `hf.cast.${c.id}.${c.id === 'hacer' ? 'voice' : 'stairwell'}`,
        name: c.name,
        seed: normalizedSeed + i + 1,
        now: START - 1,
        bornAt: START - c.age * MINUTES_PER_YEAR,
        sex: c.id === 'burak' ? 'male' : 'female',
        traits: { ...baselineTraits, ...c.traits },
        values: { ...baselineValues },
        body: {
          sleepPressure: i === (normalizedSeed >>> 1) % 4 ? 0.72 : c.id === 'derya' ? 0.55 : 0.2,
          satiety: 0.8,
          hydration: 0.8,
        },
        needs: {
          safety: 0.8,
          meaning: c.id === 'sevim' ? 0.05 : 0.65,
          belonging: 0.55,
          autonomy: i === (normalizedSeed + 1) % 4 ? 0.3 : 0.7,
        },
        voices: [{ voiceId: 'player', trust: c.id === 'hacer' ? 0.35 : 0.6 }],
        lexicon: { plainEnglish: true, names: { player: 'the caretaker' } },
        enable: { suggestionReasons: true },
      }),
    })),
    smoke: [0, 0, 0, 0, 0],
    smokeOrigin: 1 + (normalizedSeed % 4),
    wave: 'thin',
    nextWaveTicks: 0,
    hfTicks: 0,
    torch: false,
    breath: 0,
    deadline: 3000 + (normalizedSeed % 201),
    notice: 'Speak to each neighbour. Show the stair with the torch. Cross when smoke thins.',
    rescued: [],
    routeFound: false,
    log: [],
    events: [],
    lastDecisionTick: -1,
  };
}

/** A follower stops in a thick wave: no seen stair, or following under HF protest. */
function stopsInSmoke(g: Game, r: Resident): boolean {
  const floor = Math.max(0, Math.min(4, Math.round((450 - r.y) / 85)));
  return r.y < 435 && g.smoke[floor]! > 0.65 && (Boolean(r.hf.activity?.protest) || !r.routeKnown);
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const near = (g: Game, r: Resident) => distance(g.player, r) < 85;
const rounded = (n: number) => Math.round(n * 1000) / 1000;
function event(g: Game, text: string) {
  // A person repeating the same sentence to repeated pushing is shown once, not as a loop.
  if (g.events.at(-1)?.text === text) return;
  g.events.push({ tick: g.tick, text });
  g.notice = text;
}

function offer(id: string, label: string, advertises: Affordance['advertises'], effort = 0.05): Affordance {
  return { id, action: id, label, duration: 1, effort, advertises };
}

// Offers describe observed surroundings. HF scores needs, fear, trust and suggestions.
// Following the caretaker requires an invitation; proximity never creates one.
function offers(g: Game, r: Resident, invitation?: string): Affordance[] {
  const route = credence(r.hf, 'stair-visible');
  const smoke = g.smoke[Math.max(1, Math.round((450 - r.y) / 85))] ?? 0;
  const list = [
    offer('wait', r.booksReady ? 'wait by my door' : 'keep the books together', {
      safety: 0.48,
      autonomy: 0.65,
      meaning: r.booksReady ? 0 : 0.95,
    }),
    offer('rest', 'catch my breath', { rest: 0.15 }),
  ];
  if (invitation === 'follow')
    list.push(
      offer(
        'follow',
        'walk down the stair with the caretaker',
        {
          safety: Math.max(0.1, route * 0.95 - smoke * 0.15),
          belonging: r.booksReady ? 0.35 : 0.08,
          meaning: r.booksReady ? 0.3 : 0,
          autonomy: 0.2,
        },
        0.12,
      ),
    );
  if (
    r.id === 'burak' &&
    g.routeFound &&
    (g.people[0]!.booksReady || !g.people[0]!.atHome || g.people[0]!.status === 'dead')
  )
    list.push(
      offer(
        'escape',
        'take the stair to the front door',
        { safety: 0.95, autonomy: 0.9, belonging: 0.8 },
        0.1,
      ),
    );
  if (invitation === 'books' && r.id === 'sevim' && !r.booksReady)
    list.push(
      offer('books', 'tie the exercise books in a bundle', { meaning: 1, safety: 0.8, belonging: 0.8 }),
    );
  if (r.id === 'burak' && !g.routeFound)
    list.push(offer('route', 'check the stair and return', { safety: 0.95, competence: 0.6 }, 0.1));
  if (
    r.id === 'burak' &&
    g.routeFound &&
    g.people[0]!.atHome &&
    g.people[0]!.status !== 'dead' &&
    !g.people[0]!.booksReady
  )
    list.push(offer('help', 'help Sevim tie the books', { safety: 0.9, meaning: 0.95, belonging: 0.8 }, 0.1));
  return list;
}

function applyChoice(r: Resident, choice: string) {
  r.action = choice;
  if (choice === 'wait' || choice === 'rest') r.status = 'waiting';
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
    r.line = 'I will check the stair. Wait for my word.';
  } else if (choice === 'books') {
    r.status = 'waiting';
    r.line = 'Hold these steady. I can tie them in one bundle.';
  }
}

function choose(
  g: Game,
  r: Resident,
  suggestion?: { voiceId: string; affordanceId: string; strength: number; insist?: boolean },
  quiet = false,
) {
  if (g.lastDecisionTick === g.tick) return;
  g.lastDecisionTick = g.tick;
  const previousLine = r.line;
  const previousAction = r.action;
  const available = offers(g, r, suggestion?.affordanceId);
  if (suggestion) {
    const answer = answerNow(r.hf, available, suggestion);
    r.resolution = answer.resolution;
    if (answer.booked) {
      r.line = refusal(r);
      if (!quiet) event(g, `${r.name}: ${r.line}`);
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
  if (suggestion && ['refused', 'deferred', 'modified'].includes(record.suggestion?.verdict ?? ''))
    r.line = refusal(r);
  if (record.suggestion?.verdict === 'complied') r.line = 'I will come, but stop pushing me.';
  if (!quiet && (suggestion || r.line !== previousLine || r.action !== previousAction))
    event(g, `${r.name}: ${r.line}`);
}

function refusal(r: Resident): string {
  if (r.resolution?.reason === 'distrust')
    return 'You keep pushing. I need to see a clear way, not hear it again.';
  if (r.id === 'sevim' && !r.booksReady) return 'Not without the books. Stay and help me bundle them.';
  if (!r.routeKnown) return 'I cannot see the stair. Turn on the torch and show me.';
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

export function canSpeak(g: Game, id: string, line: Extract<Input, { type: 'speak' }>['line']): boolean {
  const r = g.people.find((p) => p.id === id);
  if (g.phase !== 'playing' || !r?.atHome || !near(g, r) || ['safe', 'hospital', 'dead'].includes(r.status))
    return false;
  if (r.action === 'books') return false;
  if (r.status !== 'waiting' && !(line === 'come' && r.status === 'following')) return false;
  if (line === 'books') return r.id === 'sevim' && !r.booksReady;
  if (line === 'route') return (r.id === 'burak' && !g.routeFound) || (!r.routeKnown && g.torch);
  return true;
}
function speak(g: Game, input: Extract<Input, { type: 'speak' }>) {
  const r = g.people.find((p) => p.id === input.id);
  if (!r || !canSpeak(g, input.id, input.line)) return;
  if (r.asleep) {
    r.asleep = false;
    r.line = 'I am awake. Tell me what is happening.';
    event(g, `${r.name}: ${r.line}`);
  }
  if (input.line === 'route' && r.id !== 'burak') {
    r.routeKnown = true;
    perceive(r.hf, [
      {
        at: r.hf.now,
        channel: 'saw',
        kind: 'stair',
        salience: 0.8,
        summary: 'I can see the stair to the front door.',
        claims: [{ prop: 'stair-visible', value: true, confidence: 1 }],
      },
    ]);
    if (r.action === 'lost') r.action = 'wait';
    r.line = 'I can see the stair in your torchlight. Walk with me.';
    event(g, `${r.name}: ${r.line}`);
    return;
  }
  const id = input.line === 'books' ? 'books' : input.line === 'route' ? 'route' : 'follow';
  const wasLost = r.action === 'lost',
    before = r.line;
  choose(
    g,
    r,
    {
      voiceId: 'player',
      affordanceId: id,
      strength: input.line === 'come' ? 0.9 : 0.65,
      insist:
        input.line === 'come' &&
        r.hf.will.voices.some((v) => v.voiceId === 'player' && v.accepted + v.refused > 0),
    },
    wasLost,
  );
  if (!wasLost) return;
  // HF has heard the push (trust is spent), but someone stopped in a thick wave will not set off
  // again until it thins. They say so once instead of repeating.
  let line = r.line;
  if (r.status === 'following' && stopsInSmoke(g, r)) {
    r.status = 'waiting';
    r.action = 'lost';
    line = 'Not in this smoke. Ask me again when it thins.';
    if (line === before) {
      r.line = line;
      return;
    }
  }
  r.line = line;
  event(g, `${r.name}: ${r.line}`);
}

export function step(g: Game, input?: Input): void {
  if (g.phase !== 'playing') return;
  g.tick++;
  if (g.tick === 1) {
    for (const r of g.people) event(g, r.atHome ? `${r.name}: ${r.line}` : `${r.name} is away tonight.`);
    event(
      g,
      `Smoke is starting on landing ${g.smokeOrigin}. Waves of thick smoke slow you and cost breath. Cross the stair when smoke thins.`,
    );
  }
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
  // The fire started during the preceding minute. Settle that minute before rescue decisions.
  if (g.tick === 1 || g.tick % 1200 === 0) {
    for (const r of g.people) humanTick(r.hf, START + Math.floor(g.tick / 1200));
    g.hfTicks++;
  }
  const period = 360;
  const waveTick = (g.tick + (g.seed % 100)) % period;
  g.wave = waveTick < 220 ? 'thin' : 'thick';
  g.nextWaveTicks = (waveTick < 220 ? 220 : period) - waveTick;
  g.smoke = [0, 1, 2, 3, 4].map((f) =>
    f === 0 || g.tick < Math.abs(f - g.smokeOrigin) * 100
      ? 0
      : rounded(
          Math.min(
            0.96,
            (g.wave === 'thin' ? 0.08 : 0.76) + g.tick / 18000 + (f === g.smokeOrigin ? 0.09 : 0),
          ),
        ),
  );
  const floor = Math.max(0, Math.min(4, Math.round((450 - g.player.y) / 85)));
  const density = g.smoke[floor]!;
  approach(
    g.player,
    g.player.targetX,
    g.player.targetY,
    (g.torch ? 1.65 : 2.1) * (density > 0.65 ? 0.45 : 1),
  );
  g.breath =
    Math.round(
      Math.max(
        0,
        Math.min(1, g.breath + (floor ? density * 0.00115 - (density < 0.3 ? 0.00045 : 0) : -0.003)),
      ) * 1e6,
    ) / 1e6;
  for (const r of g.people) {
    if (!r.atHome || ['safe', 'hospital', 'dead'].includes(r.status)) continue;
    const residentFloor = Math.max(0, Math.min(4, Math.round((450 - r.y) / 85)));
    r.smokeExposure = rounded(r.smokeExposure + g.smoke[residentFloor]!);
    if (r.smokeExposure >= r.smokeTolerance) {
      r.status = 'dead';
      r.action = 'dead';
      r.line = 'Died from smoke inside before firefighters arrived.';
      event(g, `${r.name} died from smoke inside before firefighters arrived.`);
      continue;
    }
    if (r.action === 'books' && !r.booksReady) {
      r.taskTicks++;
      if (r.taskTicks >= 80) {
        r.booksReady = true;
        r.action = 'wait';
        r.line = 'The bundle is tied. Show me the stair, then walk with me.';
        event(g, `${r.name}: ${r.line}`);
      }
    }
    if (r.status === 'helping' && r.action === 'route') {
      approach(r, 180, 450, 1.8);
      if (r.y >= 449) {
        g.routeFound = true;
        r.routeKnown = true;
        perceive(r.hf, [
          {
            at: r.hf.now,
            channel: 'saw',
            kind: 'stair',
            salience: 0.8,
            summary: 'I can see the stair to the front door.',
            claims: [{ prop: 'stair-visible', value: true, confidence: 1 }],
          },
        ]);
        r.status = 'waiting';
        event(g, 'Burak: I checked the stair to the front door. Cross when the smoke thins.');
        choose(g, r);
      }
    } else if (r.status === 'helping' && r.action === 'help') {
      const sevim = g.people[0]!;
      if (sevim.status === 'dead') {
        r.status = 'waiting';
        r.action = 'wait';
        r.line = 'Sevim has died. I need to get outside.';
        choose(g, r);
        continue;
      }
      approach(r, sevim.x, sevim.y, 1.8);
      if (distance(r, sevim) < 8) {
        sevim.taskTicks++;
        if (sevim.taskTicks >= 80 && !sevim.booksReady) {
          sevim.booksReady = true;
          // Copy only: Sevim may already be outside, so she cannot ask to be led.
          if (sevim.status !== 'safe') {
            sevim.line = 'The bundle is tied. Show me the stair, then walk with me.';
            event(g, `${sevim.name}: ${sevim.line}`);
          }
        }
        if (sevim.booksReady) {
          r.status = 'waiting';
          choose(g, r);
        }
      }
    } else if (r.status === 'following') {
      // In a thick wave two followers stop where they stand until spoken to again: someone who has
      // never seen the stair, even in torchlight, and anyone HF marks as following under protest.
      // Showing an unknown stair clears that stop; a protested follower needs a new invitation in thin smoke.
      const lost = !r.routeKnown;
      if (stopsInSmoke(g, r)) {
        r.status = 'waiting';
        r.action = 'lost';
        r.line = lost
          ? 'I cannot see you or the stair in this smoke. Show me the stair.'
          : 'I have stopped. You pushed me into thick smoke.';
        event(g, `${r.name}: ${r.line}`);
        continue;
      }
      // HF marks compliance under protest; a pushed follower walks slowly.
      if (distance(r, g.player) > 24 || g.player.y >= 435)
        approach(r, g.player.x, g.player.y, r.hf.activity?.protest ? 1 : 1.7);
    } else if (r.status === 'escaping') approach(r, 180, 450, 1.7);
    if ((r.status === 'following' || r.status === 'escaping') && r.y >= 435) {
      r.exitMethod = r.status === 'following' ? 'escorted' : 'alone';
      r.status = 'safe';
      r.line =
        r.id === 'sevim'
          ? r.booksReady
            ? 'The books are with me. I am outside.'
            : SEVIM_LEFT_BOOKS
          : r.id === 'burak'
            ? g.rescued.includes('sevim')
              ? 'Sevim is out. I am out too.'
              : g.routeFound
                ? 'I am outside. I checked the stair.'
                : 'I am outside.'
            : r.id === 'derya'
              ? 'Outside. I need to sit for a moment.'
              : 'I am outside. I could not have found the stair alone.';
      g.rescued.push(r.id);
      event(g, `${r.name} reached the street. ${r.name}: ${r.line}`);
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
    if (r.status === 'waiting' && !r.asleep && r.action !== 'books' && r.action !== 'lost') choose(g, r);
  }
  if (g.rescued.length === g.people.filter((r) => r.atHome).length) {
    g.phase = 'won';
    event(g, 'Everyone home tonight reached the street.');
  } else if (g.tick >= g.deadline || g.breath >= 1) {
    g.phase = 'lost';
    for (const r of g.people)
      if (r.atHome && !['safe', 'dead'].includes(r.status)) {
        r.status = 'hospital';
        r.line = 'Firefighters brought me out alive. I went to hospital with smoke injuries.';
        event(g, `${r.name}: ${r.line}`);
      }
    const dead = g.people.filter((r) => r.status === 'dead').length;
    const hospital = g.people.filter((r) => r.status === 'hospital').length;
    event(
      g,
      `${g.rescued.length} reached the street. ${dead} died inside.${hospital ? ` Firefighters brought ${hospital === 1 ? 'one more resident' : `${hospital} more residents`} out to hospital.` : ''}`,
    );
  } else if (g.tick === 1600) event(g, 'Watch for the thin wave. Cross the stair while you can see it.');
  else if (g.tick === 2400)
    event(
      g,
      `${Math.ceil((g.deadline - g.tick) / 20)} seconds until the stair closes. Bring everyone to the street.`,
    );
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
    format: 'smoke-5',
    engine: ENGINE,
    seed: g.seed,
    ticks: g.tick,
    inputs: structuredClone(g.log),
    state: structuredClone(g),
    hash: stateHash(g),
  };
}
export function replayRun(run: RunExport): Game {
  if (run.format !== 'smoke-5' || run.engine !== ENGINE) throw new Error('Unsupported Smoke replay version.');
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
