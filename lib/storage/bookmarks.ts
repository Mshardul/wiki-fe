import { api } from "@/lib/api";
import { verticalRegistry } from "@/lib/content/verticals";
import { KEYS } from "./keys";
import { getJSON, makeSnapshot, setJSON, subscribeKey } from "./local";
import { scheduleSyncMutation } from "./sync";

export interface Bookmark {
  wikiId: string;
  path: string;
  slug: string;
  title: string;
  wikiTitle: string;
}

export function getBookmarks(): Bookmark[] {
  return getJSON<Bookmark[]>(KEYS.bookmarks, []);
}

export const getBookmarksSnapshot = makeSnapshot<Bookmark[]>(KEYS.bookmarks, []);

export function isBookmarked(wikiId: string, path: string): boolean {
  return getBookmarks().some((b) => b.wikiId === wikiId && b.path === path);
}

function saveBookmarks(next: Bookmark[]): void {
  const prev = getBookmarks();
  const prevKeys = new Set(prev.map((b) => `${b.wikiId}|${b.path}`));
  const nextKeys = new Set(next.map((b) => `${b.wikiId}|${b.path}`));
  for (const b of next) {
    const k = `${b.wikiId}|${b.path}`;
    if (!prevKeys.has(k)) scheduleSyncMutation(k, () => api.bookmarks.add(b.wikiId, b.path));
  }
  for (const b of prev) {
    const k = `${b.wikiId}|${b.path}`;
    if (!nextKeys.has(k)) scheduleSyncMutation(k, () => api.bookmarks.remove(b.wikiId, b.path));
  }
  setJSON(KEYS.bookmarks, next);
}

function deriveBookmark(wikiId: string, path: string): Bookmark {
  const wiki = verticalRegistry().find((v) => v.id === wikiId);
  const dir = wiki ? wiki.indexPath.replace(/\/index\.md$/, "") : `content/${wikiId}`;
  const rest = path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : path;
  const slug = rest.replace(/\.md$/, "");
  const name = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  return { wikiId, path, slug, title: name, wikiTitle: wiki?.title ?? "" };
}

export function toggleBookmark(wikiId: string, path: string, title?: string): boolean {
  const list = getBookmarks();
  const idx = list.findIndex((b) => b.wikiId === wikiId && b.path === path);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveBookmarks(list);
    return false;
  }
  const b = deriveBookmark(wikiId, path);
  if (title) b.title = title;
  saveBookmarks([b, ...list]);
  return true;
}

export function clearBookmarks(wikiId?: string): void {
  if (!wikiId) {
    scheduleSyncMutation("bookmarks|clear", () => api.bookmarks.clear());
    setJSON(KEYS.bookmarks, []);
    return;
  }
  scheduleSyncMutation(`bookmarks|clear|${wikiId}`, () => api.bookmarks.clear(wikiId));
  setJSON(
    KEYS.bookmarks,
    getBookmarks().filter((b) => b.wikiId !== wikiId),
  );
}

export function subscribeBookmarks(cb: () => void): () => void {
  return subscribeKey(KEYS.bookmarks, cb);
}

// Overwrites local with server truth (no merge) — called on login/boot; an unreachable server leaves local untouched.
export async function pullBookmarks(): Promise<void> {
  const rows = await api.bookmarks.list().catch(() => null);
  if (!rows) return;
  setJSON(
    KEYS.bookmarks,
    rows.map((r) => deriveBookmark(r.wiki_id, r.path)),
  );
}
