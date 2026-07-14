import { state } from "../state.js";

/* ═══════════════════════════════════════════════════════════════
   OFFLINE / PWA
   ═══════════════════════════════════════════════════════════════ */
async function downloadArticle(filePath) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  const res = await fetch(filePath);
  if (res.ok) await cache.put(filePath, res);
}

async function removeArticleDownload(filePath) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  await cache.delete(filePath);
}

async function isArticleCached(filePath) {
  if (!("caches" in window)) return false;
  const cache = await caches.open("wiki-articles-v1");
  return !!(await cache.match(filePath));
}

// wikiId omitted clears every offline download; passed, scopes to that wiki's
// content path (cache keys are fetched article URLs, e.g. "./content/{wikiId}/...").
async function clearAllDownloads(wikiId) {
  if (!("caches" in window)) return;
  const cache = await caches.open("wiki-articles-v1");
  const requests = await cache.keys();
  for (const req of requests) {
    if (!wikiId || req.url.includes(`/content/${wikiId}/`)) {
      await cache.delete(req);
    }
  }
}

async function updateOfflineBtn() {
  const btn = document.getElementById("content-offline-btn");
  if (!btn || !state.currentFilePath) return;
  const cached = await isArticleCached(state.currentFilePath);
  const dlIcon = btn.querySelector(".offline-icon-download");
  const chkIcon = btn.querySelector(".offline-icon-check");
  btn.classList.toggle("active", cached);
  if (dlIcon) dlIcon.style.display = cached ? "none" : "";
  if (chkIcon) chkIcon.style.display = cached ? "" : "none";
  btn.title = cached ? "Saved offline - click to remove" : "Save for offline";
}

const Offline = {
  async toggle() {
    const path = state.currentFilePath;
    if (!path) return;
    const btn = document.getElementById("content-offline-btn");
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
};
