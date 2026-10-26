import type { Screen } from './screen';

// This policy receives only the text and enabled speech controls also rendered
// by main.ts. It cannot inspect positions, HF, seed, task timers or route flags.
export type ColdCommand =
  | { type: 'select'; id: string }
  | { type: 'street' }
  | { type: 'speech'; action: 'torch' | Screen['available'][number] };
export function coldPolicy(screen: Screen): ColdCommand | undefined {
  if (screen.phase !== 'playing') return;
  if (screen.people.some((p) => p.status.startsWith('Following'))) return { type: 'street' };
  const person = screen.people.find((p) => p.status.startsWith('Stopped'));
  if (!person) return;
  if (screen.selected !== person.id || screen.guidance.includes('to approach'))
    return { type: 'select', id: person.id };
  if (screen.guidance.includes('Wait while')) return;
  if (screen.guidance.includes('Turn on Torch')) return { type: 'speech', action: 'torch' };
  if (screen.guidance.includes('Choose The books') && screen.available.includes('books'))
    return { type: 'speech', action: 'books' };
  if (/Choose (Show|Check) the stair/.test(screen.guidance) && screen.available.includes('route'))
    return { type: 'speech', action: 'route' };
  if (screen.available.includes('together')) return { type: 'speech', action: 'together' };
}
