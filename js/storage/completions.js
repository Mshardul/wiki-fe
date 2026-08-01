import { api } from "../api.js";
import { scheduleSyncMutation, state } from "../state.js";

/* ═══════════════════════════════════════════════════════════════
   COMPLETIONS - per-wiki-per-article "mark as completed" state
   Distinct from read-state (wiki-read-*). Mirrors read-tracking.js.
   ═══════════════════════════════════════════════════════════════ */
const COMPLETED_KEY_PREFIX = "wiki-completed";

function _completedKey(wikiId) {
  return `${COMPLETED_KEY_PREFIX}-${wikiId || state.currentWikiId || "default"}`;
}

function getCompletedSet(wikiId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(_completedKey(wikiId)) || "[]"));
  } catch {
    return new Set();
  }
}

function isCompleted(path, wikiId) {
  return getCompletedSet(wikiId).has(path);
}

// Returns true only when this call actually transitioned the article to completed.
function markCompleted(path, wikiId) {
  const id = wikiId || state.currentWikiId;
  if (!path || !id) return false;
  const set = getCompletedSet(id);
  if (set.has(path)) return false;
  set.add(path);
  localStorage.setItem(_completedKey(id), JSON.stringify([...set]));
  scheduleSyncMutation(`${id}|${path}|completed`, () => api.completions.add(id, path));
  return true;
}

function markUncompleted(path, wikiId) {
  const id = wikiId || state.currentWikiId;
  if (!path || !id) return;
  const set = getCompletedSet(id);
  if (!set.has(path)) return;
  set.delete(path);
  localStorage.setItem(_completedKey(id), JSON.stringify([...set]));
  scheduleSyncMutation(`${id}|${path}|completed`, () => api.completions.remove(id, path));
}

function clearCompletions(wikiId) {
  localStorage.removeItem(_completedKey(wikiId));
}

export {
  _completedKey,
  getCompletedSet,
  isCompleted,
  markCompleted,
  markUncompleted,
  clearCompletions,
};
