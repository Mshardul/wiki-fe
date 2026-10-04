import { KEYS } from "./keys";
import { getJSON, remove, setJSON } from "./local";

export type ItemMutation = {
  kind: "bookmark.add" | "bookmark.remove" | "completion.add" | "completion.remove" | "recent.add";
  wikiId: string;
  path: string;
};
export type ClearMutation = { kind: "bookmark.clear" | "recent.clear"; wikiId?: string };
export type Mutation = ItemMutation | ClearMutation;

// clientTs is stamped when the user acted, so a late replay still orders correctly against other devices.
export type OutboxEntry = Mutation & { id: string; owner: string | null; clientTs: string };

function isClear(m: Mutation): m is ClearMutation {
  return m.kind.endsWith(".clear");
}

function domainOf(m: Mutation): string {
  return m.kind.split(".")[0] ?? m.kind;
}

// A newer mutation makes older queued ones for the same target redundant (a clear covers its whole domain or wiki).
function isSupersededBy(entry: OutboxEntry, next: Mutation): boolean {
  if (domainOf(entry) !== domainOf(next)) return false;
  if (isClear(next)) return next.wikiId === undefined || entry.wikiId === next.wikiId;
  return !isClear(entry) && entry.wikiId === next.wikiId && entry.path === next.path;
}

export function readOutbox(): OutboxEntry[] {
  return getJSON<OutboxEntry[]>(KEYS.syncOutbox, []);
}

function writeOutbox(entries: OutboxEntry[]): void {
  if (entries.length) setJSON(KEYS.syncOutbox, entries);
  else remove(KEYS.syncOutbox);
}

export function appendToOutbox(mutation: Mutation, owner: string | null, clientTs: string): void {
  const kept = readOutbox().filter((e) => !isSupersededBy(e, mutation));
  writeOutbox([...kept, { ...mutation, id: crypto.randomUUID(), owner, clientTs }]);
}

// Removal is by id against a fresh read, so another tab's concurrent appends survive.
export function removeFromOutbox(id: string): void {
  writeOutbox(readOutbox().filter((e) => e.id !== id));
}

// Entries queued before the session resolved belong to whoever it resolved to; another account's entries are dropped.
export function reconcileOwners(userId: string): void {
  const current = readOutbox();
  const next = current
    .filter((e) => e.owner === null || e.owner === userId)
    .map((e) => (e.owner === null ? { ...e, owner: userId } : e));
  if (next.length !== current.length || next.some((e, i) => e !== current[i])) writeOutbox(next);
}

export function discardUnowned(): void {
  const current = readOutbox();
  const next = current.filter((e) => e.owner !== null);
  if (next.length !== current.length) writeOutbox(next);
}

export function clearOutbox(): void {
  remove(KEYS.syncOutbox);
}
