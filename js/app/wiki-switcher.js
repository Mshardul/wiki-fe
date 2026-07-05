import { navigate } from "../render/router.js";
import { WIKIS, escHtml, state } from "../state.js";

document.getElementById("wiki-switcher-overlay").addEventListener("click", closeWikiSwitcher);

function openWikiSwitcher() {
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
}

function closeWikiSwitcher() {
  const modal = document.getElementById("wiki-switcher-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

export { openWikiSwitcher, closeWikiSwitcher };
