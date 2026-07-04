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

function markRead(path) {
  const read = getReadSet();
  if (read.has(path)) return;
  read.add(path);
  localStorage.setItem(_readKey(), JSON.stringify([...read]));
  // reads are always for the current wiki (per-wiki localStorage key); safe to use currentWikiId
  if (_loggedIn()) api.reads.add(state.currentWikiId, path).catch(() => {});
  document.querySelectorAll(".index-card-read-dot").forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path === path) dot.classList.add("visible");
  });
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
  toggle() {
    const path = state.currentFilePath;
    if (!path) return;
    if (isRead(path)) {
      markUnread(path);
    } else {
      markRead(path);
    }
    updateReadBtn();
  },
};

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
};
