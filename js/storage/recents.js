import { api } from "../api.js";
import { escHtml, state } from "../state.js";

function _loggedIn() {
  return state.session?.status === "in";
}

/* ═══════════════════════════════════════════════════════════════
   RECENTLY VISITED
   ═══════════════════════════════════════════════════════════════ */
const RECENTS_KEY = "wiki-recents";
const RECENTS_MAX = 6;

function getRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addToRecents(entry) {
  let recents = getRecents().filter((r) => r.path !== entry.path);
  recents.unshift({ ...entry, visitedAt: Date.now() });
  if (recents.length > RECENTS_MAX) recents = recents.slice(0, RECENTS_MAX);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  if (_loggedIn()) api.recents.add(entry.wikiId, entry.path).catch(() => {});
}

function saveRecents(arr) {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(arr));
}

function clearRecents(wikiId) {
  if (_loggedIn()) api.recents.clear(wikiId).catch(() => {});
  const remaining = getRecents().filter((r) => r.wikiId !== wikiId);
  saveRecents(remaining);
  document.getElementById("recents-section")?.classList.add("hidden");
}

function _relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function renderRecentsSection(wiki) {
  const section = document.getElementById("recents-section");
  if (!section) return;
  const recents = getRecents().filter((r) => r.wikiId === wiki.id);
  if (!recents.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  const chips = recents.map((r) => {
    const time = _relativeTime(r.visitedAt);
    const label = time
      ? `${escHtml(r.title)}<span class="chip-time">${escHtml(time)}</span>`
      : escHtml(r.title);
    return {
      label,
      onclick: `navigateToContent('${r.wikiId}','${encodeURIComponent(
        r.path,
      )}','${encodeURIComponent(r.title)}','${r.slug}')`,
    };
  });
  section.innerHTML = `
    <div class="recents-header">
      <span class="recents-label">Recently visited</span>
      <button class="recents-clear-btn" onclick="confirmClearRecents('${
        wiki.id
      }')" title="Clear all">
        <svg class="icon"><use href="#icon-x"></use></svg>
      </button>
    </div>
    ${_buildChipStrip(chips)}`;
}

// Duplicated small chip-strip builder (also in bookmarks.js) - kept local to avoid a shared-helpers module for a single 15-line function used by 2 files.
const CHIP_VISIBLE_MAX = 4;
function _buildChipStrip(chips) {
  const overflow = chips.length > CHIP_VISIBLE_MAX ? chips.length - CHIP_VISIBLE_MAX : 0;
  const chipHtml = chips
    .map(
      (chip, i) =>
        `<button class="recent-chip${i >= CHIP_VISIBLE_MAX ? " chip--hidden" : ""}"
          onclick="${chip.onclick}">${chip.label}</button>`,
    )
    .join("");
  const moreHtml = overflow
    ? `<button class="recents-show-more"
        onclick="var s=this.previousElementSibling;s.classList.toggle('recents-strip-expanded');this.textContent=s.classList.contains('recents-strip-expanded')?'Show less':'+${overflow} more'">
        +${overflow} more
      </button>`
    : "";
  return `<div class="recents-strip">${chipHtml}</div>${moreHtml}`;
}

export {
  RECENTS_KEY,
  RECENTS_MAX,
  getRecents,
  saveRecents,
  addToRecents,
  clearRecents,
  renderRecentsSection,
};
