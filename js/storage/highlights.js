import { removeLocalStorageByPrefix } from "../state.js";

/* ─── Per-Article Text Highlights + Inline Emoji Markers ─── */
const HIGHLIGHTS_PREFIX = "wiki-highlights-";
const MARKERS_PREFIX = "wiki-markers-";
const _highlightsKeyFor = (wikiId, articlePath) =>
  `${HIGHLIGHTS_PREFIX}${wikiId}-${articlePath.replace(/\//g, "-")}`;
const _markersKeyFor = (wikiId, articlePath) =>
  `${MARKERS_PREFIX}${wikiId}-${articlePath.replace(/\//g, "-")}`;

const MARKER_EMOJIS = ["🤔", "💡", "⭐", "🔁", "❓", "✅"];

function _readList(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function _writeList(key, list) {
  if (list.length) localStorage.setItem(key, JSON.stringify(list));
  else localStorage.removeItem(key);
}

const Highlights = {
  // { id, start, end, snippet }
  getAll(wikiId, articlePath) {
    return _readList(_highlightsKeyFor(wikiId, articlePath));
  },
  add(wikiId, articlePath, { start, end, snippet }) {
    const key = _highlightsKeyFor(wikiId, articlePath);
    const list = _readList(key);
    const entry = {
      id: `h${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      start,
      end,
      snippet,
    };
    list.push(entry);
    _writeList(key, list);
    return entry;
  },
  remove(wikiId, articlePath, id) {
    const key = _highlightsKeyFor(wikiId, articlePath);
    _writeList(
      key,
      _readList(key).filter((h) => h.id !== id),
    );
  },
  // wikiId omitted clears every wiki's highlights; passed, scopes to that wiki.
  clear(wikiId) {
    removeLocalStorageByPrefix(wikiId ? `${HIGHLIGHTS_PREFIX}${wikiId}-` : HIGHLIGHTS_PREFIX);
  },
};

const Markers = {
  // { id, offset, emoji, snippet }
  getAll(wikiId, articlePath) {
    return _readList(_markersKeyFor(wikiId, articlePath));
  },
  add(wikiId, articlePath, { offset, emoji, snippet }) {
    const key = _markersKeyFor(wikiId, articlePath);
    const list = _readList(key);
    const entry = {
      id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      offset,
      emoji,
      snippet,
    };
    list.push(entry);
    _writeList(key, list);
    return entry;
  },
  remove(wikiId, articlePath, id) {
    const key = _markersKeyFor(wikiId, articlePath);
    _writeList(
      key,
      _readList(key).filter((m) => m.id !== id),
    );
  },
  // wikiId omitted clears every wiki's markers; passed, scopes to that wiki.
  clear(wikiId) {
    removeLocalStorageByPrefix(wikiId ? `${MARKERS_PREFIX}${wikiId}-` : MARKERS_PREFIX);
  },
};

export { Highlights, Markers, MARKER_EMOJIS };
