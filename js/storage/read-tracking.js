import { state } from "../state.js";

/* ═══════════════════════════════════════════════════════════════
   QUIZ-MODE REVEAL TRACKING (lightweight confidence signal)
   ═══════════════════════════════════════════════════════════════ */
const REVEAL_KEY_PREFIX = "wiki-reveals";

function _revealKey() {
  return `${REVEAL_KEY_PREFIX}-${state.currentWikiId || "default"}`;
}

function _getRevealMap() {
  try {
    return JSON.parse(localStorage.getItem(_revealKey()) || "{}");
  } catch {
    return {};
  }
}

function recordReveal(path) {
  if (!path) return;
  const map = _getRevealMap();
  map[path] = (map[path] || 0) + 1;
  localStorage.setItem(_revealKey(), JSON.stringify(map));
}

function getRevealCount(path) {
  return _getRevealMap()[path] || 0;
}

/* ═══════════════════════════════════════════════════════════════
   OPENED-DATE TRACKING (visit timestamps for "updated since read" dots
   and index-card fade — separate from completion state)
   ═══════════════════════════════════════════════════════════════ */
const OPENED_KEY_PREFIX = "wiki-read-dates";

function _openedKey() {
  return `${OPENED_KEY_PREFIX}-${state.currentWikiId || "default"}`;
}

function _getOpenedMap() {
  try {
    return JSON.parse(localStorage.getItem(_openedKey()) || "{}");
  } catch {
    return {};
  }
}

function recordOpened(path) {
  if (!path) return;
  const map = _getOpenedMap();
  map[path] = new Date().toISOString();
  localStorage.setItem(_openedKey(), JSON.stringify(map));
}

function getLastOpened(path) {
  return _getOpenedMap()[path] || null;
}

function clearVisitHistory(wikiId) {
  localStorage.removeItem(`${REVEAL_KEY_PREFIX}-${wikiId}`);
  localStorage.removeItem(`${OPENED_KEY_PREFIX}-${wikiId}`);
}

export { recordReveal, getRevealCount, recordOpened, getLastOpened, clearVisitHistory };
