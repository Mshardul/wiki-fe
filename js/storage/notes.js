import { removeLocalStorageByPrefix } from "../state.js";
import { getCollapsed } from "./scroll-collapse.js";

/* PER-ARTICLE NOTES SCRATCHPAD */
const NOTES_PREFIX = "wiki-notes-";
const _keyFor = (wikiId, articlePath) =>
  `${NOTES_PREFIX}${wikiId}-${articlePath.replace(/\//g, "-")}`;

const Notes = {
  get(wikiId, articlePath) {
    return localStorage.getItem(_keyFor(wikiId, articlePath)) || "";
  },
  set(wikiId, articlePath, text) {
    const key = _keyFor(wikiId, articlePath);
    if (text.trim()) localStorage.setItem(key, text);
    else localStorage.removeItem(key);
  },
  // wikiId omitted clears every wiki's notes; passed, scopes to that wiki.
  clear(wikiId) {
    removeLocalStorageByPrefix(wikiId ? `${NOTES_PREFIX}${wikiId}-` : NOTES_PREFIX);
  },
};

let _saveTimer = null;
let _pendingSave = null;

function _flushPendingNotesSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_pendingSave) {
    const { wikiId, articlePath, text } = _pendingSave;
    _pendingSave = null;
    Notes.set(wikiId, articlePath, text);
  }
}

function renderNotesScratchpad(wikiId, articlePath) {
  const panel = document.getElementById("notes-scratchpad");
  const textarea = document.getElementById("notes-scratchpad-input");
  if (!panel || !textarea) return;

  _flushPendingNotesSave();

  textarea.value = Notes.get(wikiId, articlePath);

  textarea.oninput = () => {
    clearTimeout(_saveTimer);
    const text = textarea.value;
    _pendingSave = { wikiId, articlePath, text };
    _saveTimer = setTimeout(() => {
      Notes.set(wikiId, articlePath, text);
      _pendingSave = null;
      _saveTimer = null;
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
