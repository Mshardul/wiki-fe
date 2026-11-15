import { api } from "@/lib/api";
import { verticalRegistry } from "@/lib/content/verticals";
import { completionsKey } from "./keys";
import { getJSON, remove, setJSON, subscribeKey } from "./local";
import { enqueueSync } from "./sync";

function readSet(wikiId: string): Set<string> {
  return new Set(getJSON<string[]>(completionsKey(wikiId), []));
}

export function isCompleted(wikiId: string, path: string): boolean {
  return readSet(wikiId).has(path);
}

export function listCompletions(wikiId: string): string[] {
  return [...readSet(wikiId)];
}

export function listAllCompletions(): Array<{ wikiId: string; path: string }> {
  return verticalRegistry().flatMap((v) =>
    listCompletions(v.id).map((path) => ({ wikiId: v.id, path })),
  );
}

export function markCompleted(wikiId: string, path: string): boolean {
  const set = readSet(wikiId);
  if (set.has(path)) return false;
  set.add(path);
  setJSON(completionsKey(wikiId), [...set]);
  enqueueSync({ kind: "completion.add", wikiId, path });
  return true;
}

export function markUncompleted(wikiId: string, path: string): void {
  const set = readSet(wikiId);
  if (!set.delete(path)) return;
  setJSON(completionsKey(wikiId), [...set]);
  enqueueSync({ kind: "completion.remove", wikiId, path });
}

export function clearCompletions(wikiId: string): void {
  remove(completionsKey(wikiId));
}

export function subscribeCompletions(wikiId: string, cb: () => void): () => void {
  return subscribeKey(completionsKey(wikiId), cb);
}

// Snapshot over every vertical's completion key — referentially stable until any raw string changes.
function _allRaw(): string {
  return verticalRegistry()
    .map((v) => getJSON<string[]>(completionsKey(v.id), []).join("\u0000"))
    .join("\u0000");
}

let _cachedRaw = "";
let _cachedValue: Array<{ wikiId: string; path: string }> = [];

export function listAllCompletionsSnapshot(): Array<{ wikiId: string; path: string }> {
  const raw = _allRaw();
  if (raw !== _cachedRaw) {
    _cachedRaw = raw;
    _cachedValue = listAllCompletions();
  }
  return _cachedValue;
}

export function subscribeCompletionsAll(cb: () => void): () => void {
  const unsubs = verticalRegistry().map((v) => subscribeCompletions(v.id, cb));
  return () => unsubs.forEach((u) => u());
}

export async function pullCompletions(): Promise<void> {
  const rows = await api.completions.list().catch(() => null);
  if (!rows) return;
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
