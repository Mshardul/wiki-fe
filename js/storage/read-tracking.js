import { api } from "../api.js";
import { state } from "../state.js";

function _loggedIn() {
  return state.session?.status === "in";
}

/* ═══════════════════════════════════════════════════════════════
   MARK AS READ
   ═══════════════════════════════════════════════════════════════ */
const READ_KEY_PREFIX = "wiki-read";

function _readKey() {
  return `${READ_KEY_PREFIX}-${state.currentWikiId || "default"}`;
}

function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(_readKey()) || "[]"));
  } catch {
    return new Set();
  }
}

function isRead(path) {
  return getReadSet().has(path);
}

// Returns true when this call actually transitioned the article to read
// (false on a redundant call for an already-read article), so callers can
// tell a real "just finished" event apart from a no-op.
function markRead(path) {
  const read = getReadSet();
  if (read.has(path)) return false;
  read.add(path);
  localStorage.setItem(_readKey(), JSON.stringify([...read]));
  // reads are always for the current wiki (per-wiki localStorage key); safe to use currentWikiId
  if (_loggedIn()) api.reads.add(state.currentWikiId, path).catch(() => {});
  document.querySelectorAll(".index-card-read-dot").forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path === path) dot.classList.add("visible");
  });
  return true;
}

function markUnread(path) {
  const read = getReadSet();
  if (!read.has(path)) return;
  read.delete(path);
  localStorage.setItem(_readKey(), JSON.stringify([...read]));
  // reads are always for the current wiki (per-wiki localStorage key); safe to use currentWikiId
  if (_loggedIn()) api.reads.remove(state.currentWikiId, path).catch(() => {});
  document.querySelectorAll(".index-card-read-dot").forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path === path) dot.classList.remove("visible");
  });
}

function updateReadBtn() {
  const btn = document.getElementById("content-read-btn");
  if (!btn || !state.currentFilePath) return;
  const read = isRead(state.currentFilePath);
  btn.classList.toggle("active", read);
  btn.title = read ? "Mark as unread" : "Mark as read";
}

/* Quiz-mode reveal tracking - a lightweight confidence signal. */
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

const ReadToggle = {
  // Returns true when the toggle just marked the article read (vs. unread),
  // so callers can react to the "finished" transition without this module
  // reaching into UI-feedback concerns it doesn't own.
  toggle() {
    const path = state.currentFilePath;
    if (!path) return false;
    const nowRead = !isRead(path);
    if (nowRead) {
      markRead(path);
    } else {
      markUnread(path);
    }
    updateReadBtn();
    return nowRead;
  },
};

/* Last-opened timestamp per article - separate from read-set membership so
   "changed since you last read" can compare against a specific visit date. */
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

/* Clears read-set + last-opened dates + quiz reveals - one wiki, or every wiki.
   No BE call: api.reads has no bulk-clear endpoint, only per-item add/remove. */
function clearReadHistory(wikiId) {
  localStorage.removeItem(`${READ_KEY_PREFIX}-${wikiId}`);
  localStorage.removeItem(`${REVEAL_KEY_PREFIX}-${wikiId}`);
  localStorage.removeItem(`${OPENED_KEY_PREFIX}-${wikiId}`);
}

export {
  _readKey,
  getReadSet,
  isRead,
  markRead,
  markUnread,
  updateReadBtn,
  recordReveal,
  getRevealCount,
  ReadToggle,
  recordOpened,
  getLastOpened,
  clearReadHistory,
};
