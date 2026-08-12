import { api } from "../api.js";
import { fireStudyMilestone } from "../app/study-feedback.js";
import { normalizePath } from "../render/nav-utils.js";
import { scheduleSyncMutation, state } from "../state.js";

/* ═══════════════════════════════════════════════════════════════
   COMPLETIONS - per-wiki-per-article progress (sole setter via button)
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

function _refreshIndexCompletionDots(path, wikiId) {
  document.querySelectorAll(".index-card-read-dot").forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path && normalizePath(timeBadge.dataset.path) === path) {
      dot.classList.toggle("visible", isCompleted(path, wikiId));
    }
  });
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
  _refreshIndexCompletionDots(path, id);
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
  _refreshIndexCompletionDots(path, id);
}

function clearCompletions(wikiId) {
  localStorage.removeItem(_completedKey(wikiId));
}

function chipStatusHtml(done) {
  return `<span class="chip-status${done ? " chip-status--done" : ""}" aria-hidden="true"></span>`;
}

function appendChipStatus(chip, done) {
  const indicator = document.createElement("span");
  indicator.className = done ? "chip-status chip-status--done" : "chip-status";
  indicator.setAttribute("aria-hidden", "true");
  chip.prepend(indicator);
}

/* ═══════════════════════════════════════════════════════════════
   COMPLETION BUTTON - full-width toggle after the article-end-marker
   ═══════════════════════════════════════════════════════════════ */
function _setCompletionBtnState(btn, done) {
  btn.classList.toggle("completion-btn--done", done);
  btn.textContent = done ? "Completed - undo" : "Mark as completed";
  btn.setAttribute("aria-pressed", String(done));
}

function renderCompletionButton(contentEl, wikiId, filePath) {
  contentEl.querySelector(".completion-btn")?.remove();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "completion-btn";
  _setCompletionBtnState(btn, isCompleted(filePath, wikiId));

  btn.addEventListener("click", () => {
    const done = isCompleted(filePath, wikiId);
    if (done) {
      markUncompleted(filePath, wikiId);
    } else if (markCompleted(filePath, wikiId)) {
      fireStudyMilestone();
    }
    _setCompletionBtnState(btn, isCompleted(filePath, wikiId));
  });

  const marker = contentEl.querySelector(".article-end-marker");
  if (marker) {
    marker.insertAdjacentElement("afterend", btn);
  } else {
    contentEl.appendChild(btn);
  }
}

export {
  _completedKey,
  getCompletedSet,
  isCompleted,
  markCompleted,
  markUncompleted,
  clearCompletions,
  chipStatusHtml,
  appendChipStatus,
  renderCompletionButton,
};
