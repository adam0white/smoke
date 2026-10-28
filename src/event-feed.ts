/** Append every committed report in order, including reports at the same tick. */
export function appendEvents(
  list: Pick<HTMLOListElement, 'ownerDocument' | 'append'>,
  events: readonly { tick: number; text: string }[],
  cursor: number,
): number {
  while (cursor < events.length) {
    const entry = events[cursor++]!;
    const item = list.ownerDocument.createElement('li');
    item.textContent = entry.text;
    item.dataset.tick = String(entry.tick);
    list.append(item);
  }
  return cursor;
}
