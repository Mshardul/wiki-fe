import { state } from "../state.js";

/* ═══════════════════════════════════════════════════════════════
   OFFLINE / PWA
   ═══════════════════════════════════════════════════════════════ */
const CACHED_AT_KEY = "wiki-offline-cached-at";

// Cache API responses carry no write timestamp, so last-cached dates for the
// offline shelf (WIKI-298) are tracked in a parallel localStorage map,
// keyed by the same filePath used as the cache key.
function _readCachedAtMap() {
  try {
    return JSON.parse(localStorage.getItem(CACHED_AT_KEY) || "{}");
  } catch {
    return {};
  }
}

function _setCachedAt(filePath) {
  const map = _readCachedAtMap();
  map[filePath] = Date.now();
  localStorage.setItem(CACHED_AT_KEY, JSON.stringify(map));
}

function _clearCachedAt(filePath) {
  const map = _readCachedAtMap();
  delete map[filePath];
  localStorage.setItem(CACHED_AT_KEY, JSON.stringify(map));
}

function getCachedAt(filePath) {
  return _readCachedAtMap()[filePath] || null;
}

async function downloadArticle(filePath) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  const res = await fetch(filePath);
  if (res.ok) {
    await cache.put(filePath, res);
    _setCachedAt(filePath);
  }
}

async function removeArticleDownload(filePath) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  await cache.delete(filePath);
  _clearCachedAt(filePath);
}

async function isArticleCached(filePath) {
  if (!("caches" in window)) return false;
  const cache = await caches.open("wiki-articles-v1");
  return !!(await cache.match(filePath));
}

// Reconstructs the "content/<wikiId>/<rest>" key format used elsewhere (see
// listCachedArticlePaths below) from an absolute cache Request URL.
function _cacheKeyFromUrl(url) {
  const match = new URL(url).pathname.match(/\/content\/([^/]+)\/(.+\.md)$/);
  return match ? `content/${match[1]}/${match[2]}` : null;
}

// wikiId omitted clears every offline download; passed, scopes to that wiki's content path.
async function clearAllDownloads(wikiId) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  const requests = await cache.keys();
  for (const req of requests) {
    if (!wikiId || req.url.includes(`/content/${wikiId}/`)) {
      await cache.delete(req);
      const key = _cacheKeyFromUrl(req.url);
      if (key) _clearCachedAt(key);
    }
  }
}

// Returns cached article paths as { [wikiId]: filePath[] }, matching state.currentFilePath's format.
async function listCachedArticlePaths() {
  if (!("caches" in window)) return {};
  const cache = await caches.open("wiki-articles-v1");
  const requests = await cache.keys();
  const byWiki = {};
  for (const req of requests) {
    const path = new URL(req.url).pathname;
    const match = path.match(/\/content\/([^/]+)\/(.+\.md)$/);
    if (!match) continue;
    const [, wikiId, rest] = match;
    if (!byWiki[wikiId]) byWiki[wikiId] = [];
    byWiki[wikiId].push(`content/${wikiId}/${rest}`);
  }
  return byWiki;
}

async function updateOfflineBtn() {
  const btn = document.getElementById("prefs-offline-toggle");
  if (!btn || !state.currentFilePath) return;
  const cached = await isArticleCached(state.currentFilePath);
  const icon = btn.querySelector("use");
  btn.classList.toggle("active", cached);
  if (icon) icon.setAttribute("href", cached ? "#icon-check" : "#icon-download");
  btn.title = cached
    ? "Saved offline - click to remove"
    : "Save current article for offline reading";
}

const Offline = {
  async toggle() {
    const path = state.currentFilePath;
    if (!path) return;
    const btn = document.getElementById("prefs-offline-toggle");
    const cached = await isArticleCached(path);
    if (cached) {
      await removeArticleDownload(path);
    } else {
      btn?.classList.add("loading");
      await downloadArticle(path);
      btn?.classList.remove("loading");
    }
    updateOfflineBtn();
  },
};

export {
  downloadArticle,
  removeArticleDownload,
  isArticleCached,
  updateOfflineBtn,
  Offline,
  clearAllDownloads,
  listCachedArticlePaths,
  getCachedAt,
};
