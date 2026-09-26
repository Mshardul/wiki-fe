import { KEYS } from "./keys";
import { getJSON, makeSnapshot, setJSON, subscribeKey } from "./local";

const KEY = KEYS.pinnedWikis;

export function getPinnedWikis(): string[] {
  const v = getJSON<unknown>(KEY, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function setPinnedWikis(ids: string[]): void {
  setJSON(KEY, ids);
}

export function togglePinnedWiki(id: string): void {
  const pinned = getPinnedWikis();
  setPinnedWikis(pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id]);
}

export function sortByPin<T extends { id: string }>(items: T[]): T[] {
  const pinned = getPinnedWikis();
  const set = new Set(pinned);
  const head = pinned.map((id) => items.find((i) => i.id === id)).filter((i): i is T => !!i);
  const tail = items.filter((i) => !set.has(i.id));
  return [...head, ...tail];
}

export const getPinnedWikisSnapshot = makeSnapshot<string[]>(KEY, []);

export function subscribePinnedWikis(cb: () => void): () => void {
  return subscribeKey(KEY, cb);
}
