import { api, type SyncRow } from "@/lib/api";
import { verticalRegistry } from "@/lib/content/verticals";
import { completionsKey } from "./keys";
import { getJSON, remove, setJSON, subscribeKey } from "./local";
import { scheduleSyncMutation } from "./sync";

// Per-wiki completion set: local CRUD + cache-through sync. Ported from js/storage/completions.js.
function readSet(wikiId: string): Set<string> {
  return new Set(getJSON<string[]>(completionsKey(wikiId), []));
}

export function isCompleted(wikiId: string, path: string): boolean {
  return readSet(wikiId).has(path);
}

export function listCompletions(wikiId: string): string[] {
  return [...readSet(wikiId)];
}

export function markCompleted(wikiId: string, path: string): boolean {
  const set = readSet(wikiId);
  if (set.has(path)) return false;
  set.add(path);
  setJSON(completionsKey(wikiId), [...set]);
  scheduleSyncMutation(`completed|${wikiId}|${path}`, () => api.completions.add(wikiId, path));
  return true;
}

export function markUncompleted(wikiId: string, path: string): void {
  const set = readSet(wikiId);
  if (!set.delete(path)) return;
  setJSON(completionsKey(wikiId), [...set]);
  scheduleSyncMutation(`completed|${wikiId}|${path}`, () => api.completions.remove(wikiId, path));
}

export function clearCompletions(wikiId: string): void {
  remove(completionsKey(wikiId));
}

export function subscribeCompletions(wikiId: string, cb: () => void): () => void {
  return subscribeKey(completionsKey(wikiId), cb);
}

export async function pullCompletions(): Promise<void> {
  const rows = await api.completions.list().catch<SyncRow[]>(() => []);
  const byWiki = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!byWiki.has(r.wiki_id)) byWiki.set(r.wiki_id, new Set());
    byWiki.get(r.wiki_id)?.add(r.path);
  }
  for (const v of verticalRegistry()) {
    const set = byWiki.get(v.id);
    if (set) setJSON(completionsKey(v.id), [...set]);
    else remove(completionsKey(v.id));
  }
}
