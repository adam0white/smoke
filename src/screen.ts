import { approach, canSpeak, type Game, playerSpeed, type Resident, SEVIM_LEFT_BOOKS, WORLD } from './sim';

export const speech = ['come', 'books', 'together', 'route'] as const;
function movementStatus(g: Game, r: Resident): string {
  if (!r.atHome) return 'Away tonight';
  if (r.status === 'safe') return 'Outside';
  if (r.status === 'hospital') return 'At hospital with smoke injuries';
  if (r.status === 'dead') return 'Died from smoke';
  if (r.status === 'following' && r.hf.activity?.protest) return 'Following under protest · walking slowly';
  if (r.status === 'following')
    return Math.abs(r.x - g.player.x) + Math.abs(r.y - g.player.y) <= 24 && g.player.y < 435
      ? 'Following · waiting beside you. Lead me to the street.'
      : 'Following · walking toward you';
  if (r.status === 'escaping') return 'Walking to the street alone';
  if (r.action === 'route') return 'Checking the stair';
  if (r.action === 'help') return 'Helping with the books';
  if (r.action === 'books') return 'Stopped · tying the books';
  if (r.action === 'lost')
    return r.routeKnown
      ? 'Stopped · pushed into thick smoke. Wait for thin smoke, then invite me again.'
      : 'Stopped · lost in the smoke. Show me the stair.';
  if (r.action === 'rest') return 'Stopped · catching my breath';
  if (r.asleep) return 'Stopped · was asleep. Approach and speak.';
  if (!r.booksReady) return 'Stopped · needs help with the books';
  if (!r.routeKnown) return 'Stopped · needs to see the stair';
  return /coming|come, but/.test(r.line)
    ? 'Stopped · chose to wait after the last invitation'
    : `Stopped · ${r.line}`;
}
export function residentStatus(g: Game, r: Resident): string {
  const status = movementStatus(g, r);
  if (!r.atHome || ['safe', 'hospital', 'dead'].includes(r.status)) return status;
  if (r.smokeExposure >= r.smokeTolerance * 0.75) return `${status} · Smoke may kill me. Get me outside.`;
  if (r.smokeExposure >= r.smokeTolerance * 0.5) return `${status} · Smoke is making breathing difficult.`;
  return status;
}
const spot = (floor: number) => (floor ? `landing ${floor}` : 'the street');
/** Where the caretaker is, where the last tap sent them, and how long that walk takes at the current pace. */
export function readWalk(g: Game): string {
  if (g.phase !== 'playing') return '';
  const { x, y, targetX, targetY } = g.player;
  const above = (450 - y) / 85;
  const here = Math.abs(y - (WORLD.ground - Math.round(above) * 85)) < 1 ? Math.round(above) : -1;
  let text =
    here >= 0
      ? `You are ${here ? 'on' : 'at'} ${spot(here)}.`
      : `You are on the stair between ${spot(Math.floor(above))} and ${spot(Math.ceil(above))}.`;
  if (Math.abs(x - targetX) > 0.01 || Math.abs(y - targetY) > 0.01) {
    const walker = { x, y };
    let ticks = 0;
    while ((walker.x !== targetX || walker.y !== targetY) && ticks < 3000) {
      approach(walker, targetX, targetY, playerSpeed(g));
      ticks++;
    }
    const slow = playerSpeed(g) < (g.torch ? 1.65 : 2.1);
    text += ` Walking to ${spot(Math.round((WORLD.ground - targetY) / 85))} · about ${Math.ceil(ticks / 20)} s at this pace.${slow ? ' Thick smoke slows you.' : ''}`;
  }
  if (y >= 435 && g.people.some((r) => r.status === 'following'))
    text += ' Anyone following you walks out here.';
  return text;
}
export function readOutcome(g: Game) {
  const home = g.people.filter((r) => r.atHome);
  const escorted = home.filter((r) => r.exitMethod === 'escorted').length;
  return {
    heading: g.phase === 'won' ? 'Everyone is out.' : `${escorted} walked out with you.`,
    lines: home.map((r) => {
      if (r.status === 'safe')
        return `${r.name} ${r.exitMethod === 'escorted' ? 'walked out with you' : 'escaped alone'}${r.line === SEVIM_LEFT_BOOKS ? ', without her books' : ''}.`;
      if (r.status === 'dead')
        return `${r.name} was left inside and died from smoke before firefighters reached ${r.id === 'burak' ? 'him' : 'her'}.`;
      if (r.status === 'hospital')
        return `${r.name} was left inside. Firefighters brought ${r.id === 'burak' ? 'him' : 'her'} out alive. ${r.id === 'burak' ? 'He' : 'She'} went to hospital with smoke injuries.`;
      return `${r.name} is still inside.`;
    }),
  };
}
export function readScreen(g: Game, selected: string) {
  const r = g.people.find((p) => p.id === selected)!;
  const available = speech.filter((action) => canSpeak(g, selected, action));
  let guidance = 'Tap a name to approach. Grey speech buttons need you nearby.';
  if (r.status === 'following')
    guidance =
      'Tap Street to walk to the street yourself. Followers keep following you until they are outside.';
  else if (r.atHome && r.status === 'waiting') {
    if (r.action === 'books') guidance = 'Wait while the bundle is tied.';
    else if (!available.length) guidance = `Tap ${r.name} to approach. Speech becomes available nearby.`;
    else if (available.includes('books')) guidance = 'Choose The books to help tie the bundle.';
    else if (!g.torch && !r.routeKnown) guidance = 'Turn on Torch, then Show the stair.';
    else if (available.includes('route'))
      guidance =
        r.id === 'burak'
          ? 'Choose Check the stair. Burak can find the way down.'
          : 'Choose Show the stair so your neighbour can see the way.';
    else guidance = 'Choose Walk with me. Listen to the answer before speaking again.';
  }
  return {
    phase: g.phase,
    torch: g.torch,
    timer: `${g.wave === 'thick' ? 'Thick smoke' : 'Thin smoke'} · ${g.wave === 'thick' ? 'thins' : 'thickens'} in ${Math.ceil(g.nextWaveTicks / 20)}s. Stair closes in ${Math.ceil((g.deadline - g.tick) / 20)}s.${g.breath > 0.65 ? ' Breath running low. Go to the street.' : ''}`,
    guidance,
    selected,
    dialogue: r.status === 'waiting' && /coming|come, but/.test(r.line) ? residentStatus(g, r) : r.line,
    people: g.people.map((p) => ({ id: p.id, name: p.name, status: residentStatus(g, p) })),
    available,
  };
}
export type Screen = ReturnType<typeof readScreen>;
