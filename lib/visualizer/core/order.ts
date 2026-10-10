// A saved order may be stale or malformed: keep known ids once, then append anything new in default order.
export function reconcileOrder(saved: unknown, defaults: string[]): string[] {
  const kept: string[] = [];
  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (typeof id === "string" && defaults.includes(id) && !kept.includes(id)) kept.push(id);
    }
  }
  return [...kept, ...defaults.filter((d) => !kept.includes(d))];
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items;
  const target = Math.min(items.length - 1, Math.max(0, to));
  if (target === from) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved as T);
  return next;
}
