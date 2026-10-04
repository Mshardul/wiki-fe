import { api } from "@/lib/api";
import { KEYS } from "./keys";
import { getJSON, makeSnapshot, remove, setJSON, subscribeKey } from "./local";
import { enqueueSync } from "./sync";

const RECENTS_MAX = 6;

export interface Recent {
  wikiId: string;
  path: string;
  title: string;
  slug: string[];
  visitedAt: number;
}

export function getRecents(): Recent[] {
  return getJSON<Recent[]>(KEYS.recents, []);
}

export function addToRecents(entry: Omit<Recent, "visitedAt">): void {
  const next = [
    { ...entry, visitedAt: Date.now() },
    ...getRecents().filter((r) => r.path !== entry.path),
  ].slice(0, RECENTS_MAX);
  setJSON(KEYS.recents, next);
  enqueueSync({ kind: "recent.add", wikiId: entry.wikiId, path: entry.path });
}

export function clearRecentsLocal(wikiId?: string): void {
  if (!wikiId) {
    remove(KEYS.recents);
    return;
  }
  setJSON(
    KEYS.recents,
    getRecents().filter((r) => r.wikiId !== wikiId),
  );
}

export function clearRecents(wikiId?: string): void {
  enqueueSync({ kind: "recent.clear", wikiId });
  clearRecentsLocal(wikiId);
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
  const rows = await api.recents.list().catch(() => null);
  if (!rows) return;
  setJSON(
    KEYS.recents,
    rows.slice(0, RECENTS_MAX).map((r) => deriveRecent(r.wiki_id, r.path)),
  );
}
