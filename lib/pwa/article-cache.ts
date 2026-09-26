import { BASE_PATH } from "@/lib/config";
import { getJSON, setJSON } from "@/lib/storage/local";

// Direct Cache Storage ops over the "wiki-articles" runtime cache the SW also fills (app/sw.ts StaleWhileRevalidate).

const CACHE_NAME = "wiki-articles";
const STATIC_CACHE_NAME = "wiki-static";
const CACHED_AT_KEY = "wiki-offline-cached-at";
const ROUTE_RE = new RegExp(`^${BASE_PATH}/(dsa|system-design)/.+/$`);
const ASSET_RE = /["'(](\/wiki-fe\/_next\/static\/[^"'()\s]+?\.(?:js|css))["')]/g;

export interface SavedArticle {
  path: string;
  cachedAt: number;
}

function hasCaches(): boolean {
  return typeof caches !== "undefined";
}

export function articlePathToRoute(articlePath: string): string {
  const rel = articlePath.replace(/^content\//, "").replace(/\.md$/, "");
  return `${BASE_PATH}/${rel}/`;
}

export function routeToArticlePath(route: string): string {
  const rel = route.replace(new RegExp(`^${BASE_PATH}/`), "").replace(/\/$/, "");
  return `content/${rel}.md`;
}

// The Cache API keeps no write timestamp, so last-cached dates live in a parallel localStorage map keyed by route path.
function readCachedAtMap(): Record<string, number> {
  return getJSON<Record<string, number>>(CACHED_AT_KEY, {});
}

function setCachedAt(route: string): void {
  const map = readCachedAtMap();
  map[route] = Date.now();
  setJSON(CACHED_AT_KEY, map);
}

function clearCachedAt(route: string): void {
  const map = readCachedAtMap();
  delete map[route];
  setJSON(CACHED_AT_KEY, map);
}

export function getCachedAt(articlePath: string): number | null {
  return readCachedAtMap()[articlePathToRoute(articlePath)] ?? null;
}

// Next code-splits per route, so a cached HTML doc is inert without its page chunks; pull the _next/static/*.js|css the page references into wiki-static (best-effort).
async function cachePageAssets(html: string): Promise<void> {
  const urls = new Set<string>();
  for (const m of html.matchAll(ASSET_RE)) if (m[1]) urls.add(m[1]);
  if (!urls.size) return;
  const cache = await caches.open(STATIC_CACHE_NAME);
  await Promise.all(
    [...urls].map(async (url) => {
      if (await cache.match(url)) return;
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) await cache.put(url, res);
      } catch {
        // best-effort: one bad asset shouldn't fail the save
      }
    }),
  );
}

export async function saveArticle(articlePath: string): Promise<boolean> {
  if (!hasCaches()) return false;
  const route = articlePathToRoute(articlePath);
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(route, { credentials: "same-origin" });
  if (!res.ok) return false;
  const html = await res.clone().text();
  await cache.put(route, res.clone());
  await cachePageAssets(html);
  setCachedAt(route);
  return true;
}

export async function evictArticle(articlePath: string): Promise<void> {
  if (!hasCaches()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(articlePathToRoute(articlePath));
  clearCachedAt(articlePathToRoute(articlePath));
}

export async function isSaved(articlePath: string): Promise<boolean> {
  if (!hasCaches()) return false;
  const cache = await caches.open(CACHE_NAME);
  return Boolean(await cache.match(articlePathToRoute(articlePath)));
}

export async function listSaved(): Promise<SavedArticle[]> {
  if (!hasCaches()) return [];
  const cache = await caches.open(CACHE_NAME);
  const map = readCachedAtMap();
  const out: SavedArticle[] = [];
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (!ROUTE_RE.test(path)) continue;
    out.push({ path, cachedAt: map[path] ?? 0 });
  }
  return out.sort((a, b) => b.cachedAt - a.cachedAt);
}
