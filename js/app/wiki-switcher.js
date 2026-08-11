import {
  createFocusTrap,
  getFocusableIn,
  markModalClosed,
  markModalOpened,
  registerModal,
} from "../modal-registry.js";
import { navigate } from "../render/router.js";
import { WIKIS, escHtml, state } from "../state.js";

let _focusTrapHandler = null;

document.getElementById("wiki-switcher-overlay").addEventListener("click", closeWikiSwitcher);

function openWikiSwitcher() {
  if (isWikiSwitcherOpen()) return;
  const modal = document.getElementById("wiki-switcher-modal");
  const list = document.getElementById("wiki-switcher-list");
  list.innerHTML = WIKIS.map(
    (w) => `
    <button class="wiki-switcher-card${w.id === state.currentWikiId ? " wiki-switcher-card--active" : ""}"
      data-wiki-id="${escHtml(w.id)}" type="button">
      <span class="wiki-switcher-card-icon">${escHtml(w.icon || "📖")}</span>
      <span class="wiki-switcher-card-body">
        <span class="wiki-switcher-card-name">${escHtml(w.title)}</span>
        ${w.description ? `<span class="wiki-switcher-card-desc">${escHtml(w.description)}</span>` : ""}
      </span>
    </button>`,
  ).join("");
  list.querySelectorAll(".wiki-switcher-card").forEach((card) => {
    card.addEventListener("click", () => {
      closeWikiSwitcher();
      navigate(card.dataset.wikiId);
    });
  });
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const active =
    list.querySelector(".wiki-switcher-card--active") || list.querySelector(".wiki-switcher-card");
  active?.focus();

  _focusTrapHandler = createFocusTrap(modal, () => getFocusableIn(modal));
  modal.addEventListener("keydown", _focusTrapHandler);
  markModalOpened(wikiSwitcherModal);
}

function closeWikiSwitcher() {
  const modal = document.getElementById("wiki-switcher-modal");
  if (modal.classList.contains("hidden")) return;
  markModalClosed(wikiSwitcherModal);
  if (_focusTrapHandler) {
    modal.removeEventListener("keydown", _focusTrapHandler);
    _focusTrapHandler = null;
  }
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function isWikiSwitcherOpen() {
  return !document.getElementById("wiki-switcher-modal").classList.contains("hidden");
}

const wikiSwitcherModal = { isOpen: isWikiSwitcherOpen, close: closeWikiSwitcher };
registerModal(wikiSwitcherModal);

export { openWikiSwitcher, closeWikiSwitcher, isWikiSwitcherOpen };
