import { navigateToContent } from "../render/content-view.js";
import { escHtml } from "../state.js";
import { Bookmarks, getBookmarks } from "../storage/bookmarks.js";

let _opener = null;
let _focusTrapHandler = null;

function _modal() {
  return document.getElementById("bookmarks-modal");
}

function _list() {
  return document.getElementById("bookmarks-modal-list");
}

function _getFocusable() {
  return [..._modal().querySelectorAll("button:not([disabled])")];
}

function _renderList() {
  const bookmarks = getBookmarks();
  const list = _list();
  if (!bookmarks.length) {
    list.innerHTML = `<p class="recents-empty">// no bookmarks anywhere yet - press <kbd>b</kbd> on any article</p>`;
    return;
  }
  list.innerHTML = bookmarks
    .map(
      (b, i) => `
    <div class="bookmarks-modal-item" data-index="${i}">
      <button type="button" class="bookmarks-modal-entry"
        data-wiki-id="${escHtml(b.wikiId)}" data-path="${escHtml(b.path)}"
        data-title="${escHtml(b.title)}" data-slug="${escHtml(b.slug)}">
        <span class="bookmarks-modal-entry-title">${escHtml(b.title)}</span>
        <span class="bookmarks-modal-entry-wiki">${escHtml(b.wikiTitle)}</span>
      </button>
      <button type="button" class="bookmarks-modal-remove" data-path="${escHtml(b.path)}"
        title="Remove bookmark" aria-label="Remove bookmark">
        <svg class="icon"><use href="#icon-x"></use></svg>
      </button>
    </div>`,
    )
    .join("");
}

function openBookmarksModal() {
  _opener = document.activeElement;
  _renderList();
  const modal = _modal();
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  const focusable = _getFocusable();
  if (focusable.length) focusable[0].focus();

  _focusTrapHandler = (e) => {
    if (e.key !== "Tab") return;
    const els = _getFocusable();
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  modal.addEventListener("keydown", _focusTrapHandler);
}

function closeBookmarksModal() {
  const modal = _modal();
  if (modal.classList.contains("hidden")) return;
  if (_focusTrapHandler) {
    modal.removeEventListener("keydown", _focusTrapHandler);
    _focusTrapHandler = null;
  }
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  if (_opener && typeof _opener.focus === "function") {
    _opener.focus();
    _opener = null;
  }
}

function isBookmarksModalOpen() {
  return !_modal().classList.contains("hidden");
}

_list().addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".bookmarks-modal-remove");
  if (removeBtn) {
    const entry = e.target.closest(".bookmarks-modal-item").querySelector(".bookmarks-modal-entry");
    Bookmarks.togglePath(entry.dataset.wikiId, entry.dataset.path, entry.dataset.title);
    _renderList();
    const focusable = _getFocusable();
    if (focusable.length) focusable[0].focus();
    else closeBookmarksModal();
    return;
  }
  const entry = e.target.closest(".bookmarks-modal-entry");
  if (entry) {
    const { wikiId, path, title, slug } = entry.dataset;
    closeBookmarksModal();
    navigateToContent(wikiId, encodeURIComponent(path), encodeURIComponent(title), slug);
  }
});

document.getElementById("bookmarks-modal-backdrop").addEventListener("click", closeBookmarksModal);

export { openBookmarksModal, closeBookmarksModal, isBookmarksModalOpen };
