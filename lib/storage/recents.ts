import { api, type SyncRow } from "@/lib/api";
import { KEYS } from "./keys";
import { getJSON, makeSnapshot, remove, setJSON, subscribeKey } from "./local";
import { scheduleSyncMutation } from "./sync";

const RECENTS_MAX = 6;

export interface Recent {
  wikiId: string;
  path: string;
  title: string;
  slug: string[];
  visitedAt: number;
}

// Recently-visited list: local CRUD + cache-through sync. Ported from js/storage/recents.js.
export function getRecents(): Recent[] {
  return getJSON<Recent[]>(KEYS.recents, []);
}

export function addToRecents(entry: Omit<Recent, "visitedAt">): void {
  const next = [
    { ...entry, visitedAt: Date.now() },
    ...getRecents().filter((r) => r.path !== entry.path),
  ].slice(0, RECENTS_MAX);
  setJSON(KEYS.recents, next);
  scheduleSyncMutation(`recents|${entry.wikiId}|${entry.path}`, () =>
    api.recents.add(entry.wikiId, entry.path),
  );
}

export function clearRecents(wikiId?: string): void {
  if (!wikiId) {
    remove(KEYS.recents);
    scheduleSyncMutation("recents|clear", () => api.recents.clear());
    return;
  }
  setJSON(
    KEYS.recents,
    getRecents().filter((r) => r.wikiId !== wikiId),
  );
  scheduleSyncMutation(`recents|clear|${wikiId}`, () => api.recents.clear(wikiId));
}

export function subscribeRecents(cb: () => void): () => void {
  return subscribeKey(KEYS.recents, cb);
}

export const getRecentsSnapshot = makeSnapshot<Recent[]>(KEYS.recents, []);

function deriveRecent(wikiId: string, path: string): Recent {
  const name = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  const verticalPrefix = new RegExp(`^content/${wikiId}/`);
  const slug = path.replace(verticalPrefix, "").replace(/\.md$/, "").split("/");
  return { wikiId, path, title: name, slug, visitedAt: Date.now() };
}

export async function pullRecents(): Promise<void> {
  const rows = await api.recents.list().catch<SyncRow[]>(() => []);
  setJSON(
    KEYS.recents,
    rows.slice(0, RECENTS_MAX).map((r) => deriveRecent(r.wiki_id, r.path)),
  );
}
