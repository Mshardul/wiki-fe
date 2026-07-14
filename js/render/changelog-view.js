import { escHtml } from "../state.js";
import { fetchPrebuiltSearchIndex, fetchText, normalizePath, setBreadcrumb } from "./nav-utils.js";
import { showView } from "./router.js";

/* ═══════════════════════════════════════════════════════════════
   CHANGELOG VIEW
   Parses content/CHANGELOG.md into date-grouped entries, filterable by
   filename in real time. Filenames link to their article when resolvable
   against the prebuilt search index; otherwise render as plain text.
   ═══════════════════════════════════════════════════════════════ */

const DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const ENTRY_RE = /^-\s+(.+)$/;
const FILENAME_RE = /`([^`]+)`/g;

function parseChangelog(markdown) {
  const groups = [];
  let current = null;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    const dateMatch = line.match(DATE_HEADING_RE);
    if (dateMatch) {
      current = { date: dateMatch[1], entries: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;

    const entryMatch = line.match(ENTRY_RE);
    if (!entryMatch) continue;

    const text = entryMatch[1];
    const filenames = [...text.matchAll(FILENAME_RE)].map((m) => m[1]);
    if (filenames.length) current.entries.push({ text, filenames });
  }

  return groups;
}

// Maps filename basename -> { wikiId, path, title }, built once from the prebuilt search index.
let _filenameIndex = null;

async function _buildFilenameIndex() {
  if (_filenameIndex) return _filenameIndex;
  _filenameIndex = new Map();
  const prebuilt = await fetchPrebuiltSearchIndex();
  if (!prebuilt) return _filenameIndex;

  for (const [wikiId, sections] of Object.entries(prebuilt)) {
    for (const section of sections) {
      for (const card of section.cards) {
        const basename = card.path.split("/").pop();
        // First match wins; basenames are expected unique within a wiki.
        if (!_filenameIndex.has(basename)) {
          _filenameIndex.set(basename, {
            wikiId,
            path: normalizePath(card.path),
            title: card.title,
          });
        }
      }
    }
  }
  return _filenameIndex;
}

function _resolveFilename(filename) {
  const basename = filename.split("/").pop();
  return _filenameIndex?.get(basename) || null;
}

function _renderFilenameChip(filename) {
  const resolved = _resolveFilename(filename);
  if (!resolved) return `<code>${escHtml(filename)}</code>`;
  return `<code
    class="changelog-file-link"
    role="button" tabindex="0"
    onclick="navigateToContent('${resolved.wikiId}','${encodeURIComponent(
      resolved.path,
    )}','${encodeURIComponent(resolved.title)}')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"
  >${escHtml(filename)}</code>`;
}

function _renderEntryHtml(entry) {
  let html = escHtml(entry.text);
  for (const filename of entry.filenames) {
    html = html.replace(`\`${escHtml(filename)}\``, _renderFilenameChip(filename));
  }
  return html;
}

let _groups = [];

function _applyFilter(query) {
  const q = query.trim().toLowerCase();
  const container = document.getElementById("changelog-groups");
  const groupEls = [...container.querySelectorAll(".changelog-group")];

  groupEls.forEach((groupEl) => {
    let anyVisible = false;
    groupEl.querySelectorAll(".changelog-entry").forEach((entryEl) => {
      const matches = !q || entryEl.dataset.filenames.includes(q);
      entryEl.hidden = !matches;
      if (matches) anyVisible = true;
    });
    groupEl.hidden = !anyVisible;
  });
}

function _renderGroups() {
  const container = document.getElementById("changelog-groups");
  if (!_groups.length) {
    container.innerHTML = '<p class="changelog-empty">No changelog entries found.</p>';
    return;
  }

  container.innerHTML = _groups
    .map(
      (group) => `
    <section class="changelog-group">
      <h2 class="changelog-date">${escHtml(group.date)}</h2>
      <ul class="changelog-entry-list">
        ${group.entries
          .map(
            (entry) => `
          <li class="changelog-entry" data-filenames="${escHtml(
            entry.filenames.join(" ").toLowerCase(),
          )}">${_renderEntryHtml(entry)}</li>`,
          )
          .join("")}
      </ul>
    </section>`,
    )
    .join("");
}

let _filterWired = false;
function _wireFilterInput() {
  if (_filterWired) return;
  _filterWired = true;
  document.getElementById("changelog-filter-input").addEventListener("input", (e) => {
    _applyFilter(e.target.value);
  });
}

async function renderChangelog() {
  setBreadcrumb("changelog-breadcrumb", [{ label: "Home", href: "#" }, { label: "Changelog" }]);

  const filterInput = document.getElementById("changelog-filter-input");
  if (filterInput) filterInput.value = "";
  _wireFilterInput();

  showView("view-changelog");

  const container = document.getElementById("changelog-groups");
  container.innerHTML = '<p class="changelog-empty">Loading…</p>';

  try {
    const [markdown] = await Promise.all([
      fetchText("content/CHANGELOG.md"),
      _buildFilenameIndex(),
    ]);
    _groups = parseChangelog(markdown);
    _renderGroups();
  } catch {
    container.innerHTML = '<p class="changelog-empty">Failed to load changelog.</p>';
  }
}

export { renderChangelog, parseChangelog };
