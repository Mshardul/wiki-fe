import { api } from "../api.js";
import { WIKIS, escHtml, sequencedMutation, state } from "../state.js";

function _loggedIn() {
  return state.session?.status === "in";
}

/* ═══════════════════════════════════════════════════════════════
   BOOKMARKS
   ═══════════════════════════════════════════════════════════════ */
const BOOKMARKS_KEY = "wiki-bookmarks";

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBookmarks(arr) {
  if (_loggedIn()) {
    const prev = getBookmarks();
    const prevKeys = new Set(prev.map((b) => `${b.wikiId}|${b.path}`));
    const nextKeys = new Set(arr.map((b) => `${b.wikiId}|${b.path}`));
    for (const b of arr) {
      const key = `${b.wikiId}|${b.path}`;
      if (!prevKeys.has(key)) {
        sequencedMutation(key, () => api.bookmarks.add(b.wikiId, b.path)).catch(() => {});
      }
    }
    for (const b of prev) {
      const key = `${b.wikiId}|${b.path}`;
      if (!nextKeys.has(key)) {
        sequencedMutation(key, () => api.bookmarks.remove(b.wikiId, b.path)).catch(() => {});
      }
    }
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
}

function isBookmarked(path) {
  return getBookmarks().some((b) => b.path === path);
}

function updateBookmarkBtn() {
  const btn = document.getElementById("prefs-bookmark-toggle");
  if (!btn) return;
  const bookmarked = isBookmarked(state.currentFilePath);
  btn.classList.toggle("active", bookmarked);
  btn.setAttribute("aria-pressed", String(bookmarked));
  btn.title = bookmarked ? "Remove bookmark" : "Bookmark";
}

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

function renderBookmarksSection(wiki) {
  const section = document.getElementById("bookmarks-section");
  if (!section) return;
  const bookmarks = getBookmarks().filter((b) => b.wikiId === wiki.id);
  if (!bookmarks.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  const chips = bookmarks.map((b) => ({
    label: escHtml(b.title),
    onclick: `navigateToContent('${b.wikiId}','${encodeURIComponent(
      b.path,
    )}','${encodeURIComponent(b.title)}','${b.slug}')`,
  }));
  section.innerHTML = `
    <div class="recents-header">
      <span class="recents-label">Bookmarked</span>
      <button class="recents-clear-btn" onclick="confirmClearBookmarks('${
        wiki.id
      }')" title="Clear all">
        <svg class="icon"><use href="#icon-x"></use></svg>
      </button>
    </div>
    ${_buildChipStrip(chips)}`;
}

const Bookmarks = {
  togglePath(wikiId, path, title) {
    if (!path) return false;
    const bookmarks = getBookmarks();
    const idx = bookmarks.findIndex((b) => b.path === path);
    let bookmarked;
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      bookmarked = false;
    } else {
      const wiki = WIKIS.find((w) => w.id === wikiId);
      const name = path.split("/").pop().replace(/\.md$/, "");
      bookmarks.unshift({
        wikiId,
        path,
        slug: name,
        title: title || name,
        wikiTitle: wiki?.title || "",
      });
      bookmarked = true;
    }
    saveBookmarks(bookmarks);
    return bookmarked;
  },
  toggle() {
    if (!state.currentFilePath) return;
    this.togglePath(state.currentWikiId, state.currentFilePath, state.currentTitle);
    updateBookmarkBtn();
  },
  clearAll() {
    if (_loggedIn()) api.bookmarks.clear().catch(() => {});
    // write directly to skip saveBookmarks' per-item diff (avoids double-fire)
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([]));
    const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
    if (wiki) renderBookmarksSection(wiki);
  },
  clearWiki(wikiId) {
    if (_loggedIn()) api.bookmarks.clear(wikiId).catch(() => {});
    localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify(getBookmarks().filter((b) => b.wikiId !== wikiId)),
    );
    document.getElementById("bookmarks-section")?.classList.add("hidden");
  },
};

export {
  BOOKMARKS_KEY,
  getBookmarks,
  saveBookmarks,
  isBookmarked,
  updateBookmarkBtn,
  renderBookmarksSection,
  Bookmarks,
};
