import { getJSON, setJSON, subscribeKey } from "./local";

const FADE_FLOOR = 0.4;
const FADE_PERIOD_DAYS = 70;

const openedKey = (wikiId: string) => `wiki-read-dates-${wikiId}`;
const revealKey = (wikiId: string) => `wiki-reveals-${wikiId}`;

export function recordOpened(wikiId: string, path: string): void {
  if (!path) return;
  const map = getJSON<Record<string, string>>(openedKey(wikiId), {});
  map[path] = new Date().toISOString();
  setJSON(openedKey(wikiId), map);
}

export function getLastOpened(wikiId: string, path: string): string | null {
  return getJSON<Record<string, string>>(openedKey(wikiId), {})[path] ?? null;
}

export function daysSinceRead(wikiId: string, path: string): number | null {
  const iso = getLastOpened(wikiId, path);
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export function fadeFactorForDaysSinceRead(days: number | null): number {
  if (days == null || !Number.isFinite(days) || days <= 0) return 1;
  const t = Math.min(days / FADE_PERIOD_DAYS, 1);
  return Math.max(FADE_FLOOR, 1 - t * (1 - FADE_FLOOR));
}

export function recordReveal(wikiId: string, path: string): void {
  if (!path) return;
  const map = getJSON<Record<string, number>>(revealKey(wikiId), {});
  map[path] = (map[path] ?? 0) + 1;
  setJSON(revealKey(wikiId), map);
}

export function getRevealCount(wikiId: string, path: string): number {
  return getJSON<Record<string, number>>(revealKey(wikiId), {})[path] ?? 0;
}

export function subscribeReadDates(wikiId: string, cb: () => void): () => void {
  return subscribeKey(openedKey(wikiId), cb);
}
