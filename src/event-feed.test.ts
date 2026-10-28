import { expect, it } from 'vitest';
import { appendEvents } from './event-feed';

it('renders every same-tick report in order and appends later reports once', () => {
  const items: { textContent: string; dataset: Record<string, string> }[] = [];
  const list = {
    ownerDocument: { createElement: () => ({ textContent: '', dataset: {} }) },
    append: (item: (typeof items)[number]) => items.push(item),
  } as unknown as Pick<HTMLOListElement, 'ownerDocument' | 'append'>;
  const events = [
    { tick: 7, text: 'Burak: The stair is clear.' },
    { tick: 7, text: 'Derya reached the street.' },
    { tick: 7, text: 'Hacer: I can see the stair.' },
  ];
  let cursor = appendEvents(list, events, 0);
  expect(items.map((item) => item.textContent)).toEqual(events.map((event) => event.text));
  expect(items.map((item) => item.dataset.tick)).toEqual(['7', '7', '7']);
  cursor = appendEvents(list, events, cursor);
  expect(items).toHaveLength(3);
  events.push({ tick: 8, text: 'Sevim reached the street.' });
  expect(appendEvents(list, events, cursor)).toBe(4);
  expect(items.map((item) => item.textContent)).toEqual(events.map((event) => event.text));
});
