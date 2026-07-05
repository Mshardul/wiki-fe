import { getCollapsed } from "./scroll-collapse.js";

/* ─── Per-Article Notes Scratchpad ─── */
const _keyFor = (wikiId, articlePath) => `wiki-notes-${wikiId}-${articlePath.replace(/\//g, "-")}`;

const Notes = {
  get(wikiId, articlePath) {
    return localStorage.getItem(_keyFor(wikiId, articlePath)) || "";
  },
  set(wikiId, articlePath, text) {
    const key = _keyFor(wikiId, articlePath);
    if (text.trim()) localStorage.setItem(key, text);
    else localStorage.removeItem(key);
  },
};

let _saveTimer = null;

function renderNotesScratchpad(wikiId, articlePath) {
  const panel = document.getElementById("notes-scratchpad");
  const textarea = document.getElementById("notes-scratchpad-input");
  if (!panel || !textarea) return;

  textarea.value = Notes.get(wikiId, articlePath);

  textarea.oninput = () => {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      Notes.set(wikiId, articlePath, textarea.value);
    }, 300);
  };

  const toggle = document.getElementById("notes-scratchpad-toggle");
  if (toggle) {
    const collapsed = getCollapsed(`wiki-notes-collapsed-${wikiId}`);
    panel.classList.toggle("notes-scratchpad--collapsed", collapsed);
    toggle.onclick = () => {
      const key = `wiki-notes-collapsed-${wikiId}`;
      const next = !panel.classList.contains("notes-scratchpad--collapsed");
      panel.classList.toggle("notes-scratchpad--collapsed", next);
      if (next) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    };
  }
}

export { Notes, renderNotesScratchpad };
