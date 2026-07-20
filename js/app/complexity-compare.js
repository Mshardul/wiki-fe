import { extractComplexityTable } from "../content/tables.js";
import { fetchPrebuiltSearchIndex, fetchText } from "../render/nav-utils.js";
import { escHtml, getMdConverter } from "../state.js";

const DS_SECTION_HEADING = "Data Structures";
const MAX_PICKS = 4;

let _structures = null; // [{title, path, slug}] once loaded
const _picked = new Set();
const _tableCache = new Map(); // path -> parsed complexity table (or null)

async function loadStructures() {
  if (_structures) return _structures;
  const allIndexes = await fetchPrebuiltSearchIndex();
  const section = (allIndexes?.dsa || []).find((s) => s.heading === DS_SECTION_HEADING);
  _structures = (section?.cards || []).map((card) => ({
    title: card.title,
    slug: card.slug,
    path: card.path.startsWith("./") ? card.path : `./${card.path}`,
  }));
  return _structures;
}

async function fetchComplexityTable(path) {
  if (_tableCache.has(path)) return _tableCache.get(path);
  let parsed = null;
  try {
    const markdown = await fetchText(path);
    const html = getMdConverter().makeHtml(markdown);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    parsed = extractComplexityTable(wrapper);
  } catch {
    parsed = null;
  }
  _tableCache.set(path, parsed);
  return parsed;
}

function renderPickerList(filter = "") {
  const list = document.getElementById("compare-picker-list");
  const q = filter.trim().toLowerCase();
  const items = _structures.filter((s) => !q || s.title.toLowerCase().includes(q));

  list.innerHTML = items
    .map((s) => {
      const checked = _picked.has(s.path) ? "checked" : "";
      const disabled = !_picked.has(s.path) && _picked.size >= MAX_PICKS ? "disabled" : "";
      return `
        <label class="compare-picker-item">
          <input type="checkbox" data-path="${escHtml(s.path)}" ${checked} ${disabled} />
          <span>${escHtml(s.title)}</span>
        </label>`;
    })
    .join("");
}

function updateCompareBtn() {
  const btn = document.getElementById("compare-run-btn");
  btn.disabled = _picked.size < 2;
  btn.textContent = `Compare (${_picked.size})`;
}

async function runCompare() {
  const status = document.getElementById("compare-status");
  status.textContent = "Loading complexity tables…";

  const chosen = _structures.filter((s) => _picked.has(s.path));
  const results = await Promise.all(
    chosen.map(async (s) => ({ struct: s, table: await fetchComplexityTable(s.path) })),
  );

  const found = results.filter((r) => r.table);
  if (!found.length) {
    status.textContent = "No complexity tables found for the selected structures.";
    document.getElementById("compare-matrix-wrap").innerHTML = "";
    return;
  }

  const operations = [...new Set(found.flatMap((r) => r.table.rows.map((row) => row.operation)))];

  const cols = found.flatMap((r) =>
    r.table.columns.map((col) => ({ struct: r.struct, table: r.table, col })),
  );

  const headRow = `<tr><th>Operation</th>${found
    .map((r) => `<th colspan="${r.table.columns.length}">${escHtml(r.struct.title)}</th>`)
    .join("")}</tr>`;
  const subHeadRow = `<tr><th></th>${cols.map((c) => `<th>${escHtml(c.col)}</th>`).join("")}</tr>`;

  const bodyRows = operations
    .map((op) => {
      const cells = cols
        .map(({ table, col }) => {
          const row = table.rows.find((r) => r.operation === op);
          return `<td>${escHtml(row?.values[col] ?? "—")}</td>`;
        })
        .join("");
      return `<tr><td>${escHtml(op)}</td>${cells}</tr>`;
    })
    .join("");

  document.getElementById("compare-matrix-wrap").innerHTML = `
    <table class="complexity-compare-table">
      <thead>${headRow}${subHeadRow}</thead>
      <tbody>${bodyRows}</tbody>
    </table>`;

  const missing = results.length - found.length;
  status.textContent = missing
    ? `${found.length} of ${results.length} structures had a complexity table (${missing} skipped).`
    : `Comparing ${found.length} structures.`;
}

async function openComparePicker() {
  const modal = document.getElementById("compare-modal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("compare-matrix-wrap").innerHTML = "";
  document.getElementById("compare-status").textContent = "";
  document.getElementById("compare-search-input").value = "";

  await loadStructures();
  renderPickerList();
  updateCompareBtn();
  document.getElementById("compare-search-input").focus();
}

function closeComparePicker() {
  const modal = document.getElementById("compare-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function isComparePickerOpen() {
  return !document.getElementById("compare-modal").classList.contains("hidden");
}

document.getElementById("compare-overlay").addEventListener("click", closeComparePicker);
document.getElementById("compare-close").addEventListener("click", closeComparePicker);

document.getElementById("compare-search-input").addEventListener("input", (e) => {
  renderPickerList(e.target.value);
});

document.getElementById("compare-picker-list").addEventListener("change", (e) => {
  const input = e.target.closest("input[type=checkbox]");
  if (!input) return;
  if (input.checked) _picked.add(input.dataset.path);
  else _picked.delete(input.dataset.path);
  renderPickerList(document.getElementById("compare-search-input").value);
  updateCompareBtn();
});

document.getElementById("compare-run-btn").addEventListener("click", runCompare);

export { openComparePicker, closeComparePicker, isComparePickerOpen };
