/** Smoke supplies deterministic world receipts; HF owns every actor decision and state change.
 * Host checkpoints retain offer identities and the accepted transaction journal lives in the HF archive.
 */
import {
  type ActualConsequences,
  createPerson,
  createRun,
  type DeepReadonly,
  exportRun,
  type Input,
  inspect,
  type Offer,
  type PersonAuthoring,
  type Result,
  type RunArchive,
  type RunSpec,
  restoreRun,
  type StepResult,
  step,
} from '@adam0white/human-framework';

export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const START = 370 * MINUTE;
export function need<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.path}: ${result.error.message}`);
  return result.value;
}
export function smokeSpec(seed = 7): RunSpec {
  const demands = { effort: 0, focus: 0, mode: 'awake' as const, requires: {} };
  return {
    id: 'smoke',
    seed,
    start: START,
    host: { id: 'world', edition: 'smoke-6', schema: 'smoke-6' },
    definitions: {
      actions: ['wait', 'rest', 'follow', 'escape', 'books', 'route', 'help'].map((id) => ({
        id,
        label: id,
        demands: { ...demands },
        tags: id === 'rest' ? ['rest'] : [],
        norms: [],
      })),
      norms: [],
      marriageCustoms: [],
      skills: [],
      skillTransfers: [],
      methods: [],
      routines: [],
      sources: [
        { type: 'host', id: 'world' },
        { type: 'voice', id: 'player' },
      ],
      lexicon: { names: {}, roles: {}, prefer: 'name', actions: {} },
      calendar: {
        id: 'calendar',
        epoch: { id: 'epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [
          { dayIndex: 0, start: 0, windows: [] },
          { dayIndex: 1, start: DAY, windows: [] },
        ],
      },
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: null },
  };
}
export function authoredPerson(id: string, name: string, sex: 'female' | 'male' = 'female'): PersonAuthoring {
  return {
    id,
    identity: { name, birthAt: START - 30 * 365 * DAY, sex },
    biography: [],
    origin: {
      kind: 'authored',
      basis: { kind: 'evidence', id: `author:${id}` },
      traits: { kind: 'explicit-authoring', evidence: { kind: 'evidence', id: `traits:${id}` } },
    },
    state: {
      traits: {
        honesty: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
      },
      values: {
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
      },
      body: {
        satiety: 0.8,
        hydration: 0.85,
        sleepPressure: 0.2,
        exertion: 0,
        fitness: 0.5,
        health: 1,
        pain: 0,
        sleepDebtHours: 0,
        depletion: 0,
        circadianPeakMs: 16 * 60 * MINUTE,
        asleep: false,
        since: START,
        doze: {
          context: { posture: 'upright', stimulation: 0.5 },
          basis: { kind: 'authored', author: 'world', at: START },
        },
        bladder: { fill: 0, pending: 0 },
        injuries: [],
        illnesses: [],
        exposures: [],
      },
      needs: {
        safety: 0.8,
        belonging: 0.7,
        esteem: 0.6,
        autonomy: 0.7,
        competence: 0.6,
        leisure: 0.6,
        meaning: 0.6,
      },
      skills: [],
      heldNorms: [],
      beliefs: [],
      consequences: [],
      sourceTrust: [],
      context: {
        scarcity: { kind: 'prior', value: 0, basis: 'engineering:source-zero-context' },
        smoking: { kind: 'unobserved' },
      },
      relationships: [],
      voices: [{ voiceId: 'player', trust: 0.5 }],
      agenda: {
        exemptions: { traveling: { kind: 'unobserved' }, illnessSeverity: { kind: 'unobserved' } },
        commitments: [],
        goals: [],
        precommitments: [],
        owed: [],
      },
      family: { contactCovered: [], aptitudes: {} },
      groups: [],
      reserve: {},
      retention: { trace: 32, chronicleDays: 120 },
      habits: [],
      expectations: [],
      affect: { mood: { valence: 0, arousal: 0.3 }, regulation: 0.3, emotions: [] },
      promptings: { reading: 'none', responses: [] },
      review: { style: 'accounting', atMsOfDay: 21 * 60 * MINUTE },
      bonds: { courtships: [], marriages: [] },
    },
  };
}

type GameOffer = { id: string; label: string; expected: Record<string, number>; effort: number };
type Active = { id: string; person: string; offerId: string; actionId: string; start: number; end: number };
type Checkpoint = {
  format: 'smoke-hf4-1';
  archive: RunArchive;
  serial: number;
  nextAt: number | null;
  revisions: Record<string, number>;
  active: Record<string, Active>;
  books: Record<string, Offer[]>;
};
export function createHumanRun(
  seed: number,
  actual: (action: Active) => ActualConsequences = () => ({ exposures: [], observedProgress: [] }),
  saved?: Checkpoint,
) {
  let run = saved ? need(restoreRun(saved.archive)) : need(createRun(smokeSpec(seed)));
  const people = [
    {
      id: 'sevim',
      name: 'Sevim',
      sex: 'female',
      age: 69,
      traits: {
        honesty: 0.6,
        extraversion: 0.6,
        agreeableness: 0.35,
        conscientiousness: 0.85,
        openness: 0.4,
      },
    },
    {
      id: 'burak',
      name: 'Burak',
      sex: 'male',
      age: 31,
      traits: { honesty: 0.8, extraversion: 0.3, agreeableness: 0.7, conscientiousness: 0.8, openness: 0.5 },
    },
    {
      id: 'derya',
      name: 'Derya',
      sex: 'female',
      age: 44,
      traits: { honesty: 0.7, extraversion: 0.35, agreeableness: 0.6, emotionality: 0.5, openness: 0.55 },
    },
    {
      id: 'hacer',
      name: 'Hacer',
      sex: 'female',
      age: 58,
      traits: { extraversion: 0.8, agreeableness: 0.45, honesty: 0.5, emotionality: 0.6 },
    },
  ] as const;
  // These are authored game assumptions, not claims about real people.
  for (const [i, person] of (saved ? [] : people).entries()) {
    const author = authoredPerson(person.id, person.name, person.sex);
    author.identity.birthAt = START - person.age * 365 * DAY;
    author.state.traits = { ...author.state.traits, ...person.traits };
    author.state.body.sleepPressure = i === (seed >>> 1) % 4 ? 0.72 : person.id === 'derya' ? 0.55 : 0.2;
    author.state.body.satiety = 0.8;
    author.state.body.hydration = 0.8;
    author.state.needs = {
      ...author.state.needs,
      safety: 0.8,
      meaning: person.id === 'sevim' ? 0.05 : 0.65,
      belonging: 0.55,
      autonomy: i === (seed + 1) % 4 ? 0.3 : 0.7,
    };
    author.state.voices = [{ voiceId: 'player', trust: person.id === 'hacer' ? 0.35 : 0.6 }];
    need(createPerson(run, author));
  }
  // The accepted public input journal permits rollback without exporting every tick.
  const initial = saved?.archive.initial ?? exportRun(run).initial;
  const journal = (saved?.archive.history ?? []).map(({ until, inputs }) => ({
    until,
    inputs: structuredClone(inputs) as Input[],
  }));
  let serial = saved?.serial ?? 0;
  let clock = saved ? saved.archive.current.at - START : 0;
  let nextAt = saved?.nextAt ?? null;
  const revisions: Record<string, number> = structuredClone(saved?.revisions ?? {});
  const active: Record<string, Active> = structuredClone(saved?.active ?? {});
  const books: Record<string, Offer[]> = structuredClone(saved?.books ?? {});
  const source = { type: 'host' as const, id: 'world' };
  function serve(
    until: number,
    inputs: Input[] = [],
    pause = false,
    accepted?: () => void,
  ): DeepReadonly<StepResult>['events'] {
    const events: DeepReadonly<StepResult>['events'][number][] = [];
    const target = Math.max(until, clock + (inputs.length ? 1 : 0));
    if (inputs.length) inputs = inputs.map((input) => ({ ...input, at: START + target }));
    let staged: Record<string, Active> | undefined;
    for (let i = 0; i < 1000; i++) {
      const call = { until: START + target, inputs };
      const result = need(step(run, call));
      journal.push(structuredClone(call));
      if (accepted) {
        accepted();
        accepted = undefined;
      }
      clock = result.at - START;
      nextAt = result.nextAt;
      if (staged) {
        for (const key of Object.keys(active)) delete active[key];
        Object.assign(active, staged);
        staged = undefined;
      }
      events.push(...result.events);
      if (result.boundary.type === 'until' || pause) return events;
      const candidate = { ...active };
      inputs = [...result.boundary.requests]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((request): Input => {
          if (request.kind !== 'action') throw new Error('Unexpected communication request');
          const base = {
            requestId: request.id,
            requestHash: request.requestHash,
            person: request.person,
            activityId: request.activityId,
            stage: request.stage,
            worldRevision: request.worldRevision,
            observations: [],
          };
          if (request.stage === 'start') {
            const offer = books[request.person]?.find((o) => o.id === request.offerId);
            if (!offer) throw new Error('Unknown action offer');
            candidate[request.person] = {
              id: request.activityId,
              person: request.person,
              offerId: request.offerId,
              actionId: offer.actionId,
              start: request.boundaryAt,
              end: request.boundaryAt + offer.durationMs,
            };
            return {
              id: `receipt:${request.id}`,
              at: request.boundaryAt,
              source,
              kind: 'action.resolved',
              payload: { ...base, disposition: 'accepted' },
            };
          }
          const entry = candidate[request.person];
          if (!entry || entry.id !== request.activityId) throw new Error('Unknown active action');
          delete candidate[request.person];
          const status = request.stage === 'finish' ? ('completed' as const) : ('interrupted' as const);
          return {
            id: `receipt:${request.id}`,
            at: request.boundaryAt,
            source,
            kind: 'action.resolved',
            payload: {
              ...base,
              disposition: status,
              outcome: {
                activityId: entry.id,
                offerId: entry.offerId,
                actionId: entry.actionId,
                start: entry.start,
                end: request.boundaryAt,
                status,
                evidenceId: `outcome:${request.id}`,
                actual: actual(entry),
                fulfills: [],
                advances: [],
              },
            },
          };
        });
      staged = candidate;
    }
    throw new Error('HF4 boundary budget exceeded');
  }
  function decide(
    person: string,
    at: number,
    options: GameOffer[],
    suggestion?: { affordanceId: string; strength: number; insist?: boolean },
    pause = false,
  ) {
    const revision = (revisions[person] ?? 0) + 1;
    const offers: Offer[] = options.map((o) => ({
      id: o.id,
      actionId: o.id,
      label: o.label,
      person,
      durationMs: ['follow', 'escape', 'route', 'help'].includes(o.id) ? 30_000 : 4000,
      participants: [],
      alongside: [],
      demands: { effort: o.effort, focus: 0, mode: 'awake', requires: {} },
      tags: [],
      norms: [],
      expected: { needs: o.expected, followedBy: [], provenance: ['smoke:authored'] },
      fulfills: [],
      advances: [],
      diminishes: [],
    }));
    const n = serial + 1;
    return serve(
      at,
      [
        {
          id: `offers:${n}`,
          at: START + at,
          source,
          kind: 'offers.received',
          payload: { person, revision, offers },
        },
        ...(suggestion
          ? [
              {
                id: `suggestion:${n}`,
                at: START + at,
                source: { type: 'voice' as const, id: 'player' },
                kind: 'suggestion.received' as const,
                payload: {
                  person,
                  received: {
                    kind: 'ordinary' as const,
                    suggestion: { ...suggestion, voiceId: 'player', adviceId: `advice:${n}` },
                  },
                },
              },
            ]
          : []),
        {
          id: `decision:${n}`,
          at: START + at,
          source,
          kind: 'decision.requested',
          payload: {
            person,
            reason: 'game decision',
            treatment: suggestion ? 'reconsider' : 'ordinary',
            offerRevision: revision,
          },
        },
      ],
      pause,
      () => {
        serial = n;
        revisions[person] = revision;
        books[person] = offers;
      },
    );
  }
  function interrupt(person: string, at: number, reason: string) {
    const entry = active[person];
    if (!entry) return [];
    const n = serial + 1;
    const revision = (revisions[person] ?? 0) + 1;
    return serve(
      at,
      [
        {
          id: `interrupt-offers:${n}`,
          at: START + at,
          source,
          kind: 'offers.received',
          payload: { person, revision, offers: [] },
        },
        {
          id: `interrupt:${n}`,
          at: START + at,
          source,
          kind: 'activity.interrupted',
          payload: { person, activityId: entry.id, reason },
        },
      ],
      false,
      () => {
        serial = n;
        revisions[person] = revision;
        books[person] = [];
      },
    );
  }
  function observeStair(person: string, at: number) {
    const n = serial + 1;
    const evidenceId = `stair:${n}`;
    return serve(
      at,
      [
        {
          id: evidenceId,
          at: START + at,
          source,
          kind: 'observation.received',
          payload: {
            person,
            evidenceId,
            percepts: [
              {
                id: `percept:${n}`,
                occurredAt: START + at,
                channel: 'saw',
                kind: 'stair',
                salience: 0.8,
                summary: 'I can see the stair to the front door.',
                claims: [{ prop: 'stair-visible', value: true, confidence: 1 }],
                norms: [],
                advice: [],
                consequences: [],
                withdrawConsequences: [],
                witnesses: [],
                reports: [],
                provenance: [evidenceId],
              },
            ],
          },
        },
      ],
      false,
      () => {
        serial = n;
      },
    );
  }
  function beliefs(person: string) {
    const view = need(inspect(run, { perspective: { kind: 'host' }, people: [person], select: ['beliefs'] }));
    const entry = view.people[0];
    if (entry?.kind !== 'host') throw new Error('Missing host inspection');
    const beliefs = entry.parts.find((p) => p.select === 'beliefs');
    return beliefs?.value ?? [];
  }
  function voices(person: string) {
    const view = need(
      inspect(run, { perspective: { kind: 'host' }, people: [person], select: ['relationships'] }),
    );
    const entry = view.people[0];
    if (entry?.kind !== 'host') throw new Error('Missing host inspection');
    return entry.parts.find((p) => p.select === 'relationships')?.value.voices ?? [];
  }
  function beginTransaction() {
    return {
      serial,
      clock,
      nextAt,
      length: journal.length,
      revisions: { ...revisions },
      active: { ...active },
      books: { ...books },
    };
  }
  function rollback(token: ReturnType<typeof beginTransaction>) {
    const restored = need(createRun(structuredClone(initial.spec) as RunSpec));
    for (const person of initial.people)
      need(createPerson(restored, structuredClone(person) as PersonAuthoring));
    for (const call of journal.slice(0, token.length)) need(step(restored, call));
    run = restored;
    journal.length = token.length;
    serial = token.serial;
    clock = token.clock;
    nextAt = token.nextAt;
    for (const [target, source] of [
      [revisions, token.revisions],
      [active, token.active],
      [books, token.books],
    ] as const) {
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, source);
    }
  }
  function checkpoint(): Checkpoint {
    return {
      format: 'smoke-hf4-1',
      archive: exportRun(run) as RunArchive,
      serial,
      nextAt,
      revisions: structuredClone(revisions),
      active: structuredClone(active),
      books: structuredClone(books),
    };
  }
  return {
    get run() {
      return run;
    },
    beginTransaction,
    rollback,
    archive: () => exportRun(run) as RunArchive,
    checkpoint,
    get nextAt() {
      return nextAt;
    },
    active,
    decide,
    advance: (at: number) => serve(at),
    observeStair,
    beliefs,
    voices,
    interrupt,
  };
}

export function restoreHumanRun(data: unknown, actual?: (action: Active) => ActualConsequences) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Invalid Smoke HF checkpoint');
  const saved = data as Checkpoint;
  if (
    Object.keys(saved).sort().join(',') !== 'active,archive,books,format,nextAt,revisions,serial' ||
    saved.format !== 'smoke-hf4-1' ||
    !Number.isSafeInteger(saved.serial) ||
    saved.serial < 0 ||
    (saved.nextAt !== null &&
      (!Number.isSafeInteger(saved.nextAt) || saved.nextAt < saved.archive?.current?.at)) ||
    !saved.archive ||
    saved.archive.host?.id !== 'world' ||
    saved.archive.host.edition !== 'smoke-6' ||
    saved.archive.host.schema !== 'smoke-6'
  )
    throw new Error('Unsupported Smoke HF checkpoint. Keep the file and start fresh.');
  for (const object of [saved.revisions, saved.active, saved.books])
    if (!object || typeof object !== 'object' || Array.isArray(object))
      throw new Error('Invalid Smoke HF checkpoint');
  const decoded = need(restoreRun(saved.archive));
  // Query a disposable restored run; never infer scheduler state from archive internals.
  if (saved.archive.history.length) {
    const projected = need(step(decoded, { until: saved.archive.current.at, inputs: [] }));
    if (saved.nextAt !== projected.nextAt) throw new Error('Invalid Smoke HF scheduler boundary');
  } else if (saved.nextAt !== null) throw new Error('Invalid Smoke HF scheduler boundary');
  let highestSerial = 0;
  for (const transaction of saved.archive.history)
    for (const input of transaction.inputs) {
      const match = /^(?:offers|decision|suggestion|stair|interrupt|interrupt-offers):(\d+)$/.exec(input.id);
      if (match) highestSerial = Math.max(highestSerial, Number(match[1]));
    }
  if (saved.serial !== highestSerial) throw new Error('Invalid Smoke HF input sequence');
  const expectedRevisions: Record<string, number> = {};
  const expectedBooks: Record<string, Offer[]> = {};
  for (const transaction of saved.archive.history)
    for (const input of transaction.inputs) {
      if (input.kind === 'offers.received') {
        expectedRevisions[input.payload.person] = input.payload.revision;
        expectedBooks[input.payload.person] = input.payload.offers as Offer[];
      }
    }
  const canonical = (value: unknown): string =>
    JSON.stringify(value, (_key, item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item,
    );
  if (
    canonical(expectedRevisions) !== canonical(saved.revisions) ||
    canonical(expectedBooks) !== canonical(saved.books)
  )
    throw new Error('Invalid Smoke HF offer state');
  for (const [id, actor] of Object.entries(saved.archive.current.people)) {
    if (
      actor.activity &&
      !saved.active[id] &&
      !saved.archive.current.pending.some(
        (p) =>
          p.kind === 'action' &&
          p.person === id &&
          p.stage === 'start' &&
          p.activityId === actor.activity?.id,
      )
    )
      throw new Error('Invalid Smoke HF active state');
  }
  for (const [id, entry] of Object.entries(saved.active)) {
    const actor = saved.archive.current.people[id];
    if (
      !actor?.activity ||
      actor.activity.id !== entry.id ||
      entry.person !== id ||
      actor.activity.offer.id !== entry.offerId ||
      actor.activity.offer.actionId !== entry.actionId ||
      actor.activity.startedAt !== entry.start ||
      actor.activity.endsAt !== entry.end
    )
      throw new Error('Invalid Smoke HF active state');
  }
  return createHumanRun(saved.archive.initial.spec.seed, actual, saved);
}
