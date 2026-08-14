import { state } from "../state.js";
import { recordReveal } from "../storage/read-tracking.js";
import { getHiddenTableColumns, setHiddenTableColumns } from "../storage/table-columns.js";

/* QUIZ-ME MODE FOR COMPLEXITY TABLES */

const COMPLEXITY_HEADER_RE = /\b(time|space|complexity|best|worst|average)\b/i;
const BIG_O_RE = /[OΘΩ]\s*\(/;
const WHOLE_CELL_NUM_RE = /^-?\d+(\.\d+)?$/;

function isComplexityTable(table) {
  const headText = table.querySelector("thead, tr")?.textContent || "";
  if (COMPLEXITY_HEADER_RE.test(headText)) return true;
  return [...table.querySelectorAll("td")].some((td) => BIG_O_RE.test(td.textContent));
}

function addQuizTables(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    if (!isComplexityTable(table)) return;
    table.classList.add("quiz-table");
    table.querySelectorAll("tbody tr, tr").forEach((row) => {
      const cells = [...row.querySelectorAll("td")];
      cells.slice(1).forEach((td) => td.classList.add("quiz-cell"));
    });
  });
}

function _revealQuizCell(td) {
  if (!td.classList.contains("quiz-blurred")) return;
  td.classList.remove("quiz-blurred");
  recordReveal(state.currentFilePath);
}

function _syncQuizBtn(active) {
  const btn = document.getElementById("content-quiz-btn");
  if (!btn) return;
  btn.classList.toggle("active", active);
  btn.title = active ? "Exit quiz mode" : "Quiz mode";
}

const QuizMode = {
  active: false,

  toggle() {
    const tables = document.querySelectorAll("#markdown-body .quiz-table");
    if (!tables.length) return;
    this.active = !this.active;
    document.querySelectorAll("#markdown-body .quiz-cell").forEach((td) => {
      td.classList.toggle("quiz-blurred", this.active);
    });
    _syncQuizBtn(this.active);
  },

  bind(contentEl) {
    contentEl.addEventListener("click", (e) => {
      const td = e.target.closest(".quiz-cell.quiz-blurred");
      if (td) _revealQuizCell(td);
    });
  },

  reset() {
    this.active = false;
    _syncQuizBtn(false);
  },
};

/* COMPLEXITY TABLE EXTRACTION */

function extractComplexityTable(contentEl) {
  const table = [...contentEl.querySelectorAll("table")].find(isComplexityTable);
  if (!table) return null;

  const headerCells = [...(table.querySelector("thead")?.querySelectorAll("th") || [])];
  const columns = headerCells.slice(1).map((th) => th.textContent.trim());
  if (!columns.length) return null;

  const rows = [...table.querySelectorAll("tbody tr, tr")]
    .filter((row) => row.querySelectorAll("td").length)
    .map((row) => {
      const cells = [...row.querySelectorAll("td")];
      const operation = cells[0]?.textContent.trim() || "";
      const values = {};
      columns.forEach((col, i) => {
        values[col] = cells[i + 1]?.textContent.trim() || "";
      });
      return { operation, values };
    });

  return rows.length ? { columns, rows } : null;
}

/* TABLE COLUMN SORT */
function addTableSort(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    const thead = table.querySelector("thead");
    if (!thead) return;
    const ths = Array.from(thead.querySelectorAll("th"));
    if (!ths.length) return;

    let sortCol = -1;
    let sortAsc = true;

    ths.forEach((th, colIdx) => {
      th.classList.add("sortable-th");
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      th.setAttribute("aria-label", `Sort by ${th.textContent.trim()}`);

      const doSort = () => {
        if (sortCol === colIdx) {
          sortAsc = !sortAsc;
        } else {
          sortCol = colIdx;
          sortAsc = true;
        }
        ths.forEach((h, i) => {
          h.classList.toggle("sort-asc", i === colIdx && sortAsc);
          h.classList.toggle("sort-desc", i === colIdx && !sortAsc);
        });

        const tbody = table.querySelector("tbody") || table;
        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort((a, b) => {
          const aText = a.cells[colIdx]?.textContent.trim() ?? "";
          const bText = b.cells[colIdx]?.textContent.trim() ?? "";
          const aIsNum = WHOLE_CELL_NUM_RE.test(aText);
          const bIsNum = WHOLE_CELL_NUM_RE.test(bText);
          const aNum = aIsNum ? Number(aText) : NaN;
          const bNum = bIsNum ? Number(bText) : NaN;
          // Non-numeric after numeric keeps 3+ row order transitive vs pairwise localeCompare.
          let cmp;
          if (aIsNum && bIsNum) cmp = aNum - bNum;
          else if (aIsNum) cmp = -1;
          else if (bIsNum) cmp = 1;
          else cmp = aText.localeCompare(bText, undefined, { numeric: true });
          return sortAsc ? cmp : -cmp;
        });
        rows.forEach((r) => tbody.appendChild(r));
      };

      th.addEventListener("click", doSort);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          doSort();
        }
      });
    });
  });
}

/* TABLE SCROLL CUE */
function addTableScrollCues(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    const updateCue = () => {
      const overflows = wrap.scrollWidth > wrap.clientWidth + 4;
      const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
      wrap.classList.toggle("scroll-cue", overflows && !atEnd);
    };

    wrap.addEventListener("scroll", updateCue, { passive: true });
    const ro = new ResizeObserver(updateCue);
    ro.observe(wrap);
    state.tableResizeObservers.push(ro);
    updateCue();
  });
}

function _isComparisonTable(table) {
  const h2 = table.closest(".section")?.querySelector(":scope > .section-title h2");
  return /\bcomparison\b/i.test((h2?.textContent || "").replace(/[#]+$/g, ""));
}

function _setColumnHidden(table, colIdx, hidden) {
  table.querySelectorAll("tr").forEach((row) => {
    const cell = row.children[colIdx];
    if (cell) cell.classList.toggle("table-col-hidden", hidden);
  });
}

function addComparisonColumnToggles(contentEl) {
  const wikiId = state.currentWikiId;
  const articlePath = state.currentFilePath || "";
  if (!wikiId) return;

  contentEl.querySelectorAll("table").forEach((table) => {
    if (!_isComparisonTable(table)) return;
    const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
    const headers = [...(headerRow?.querySelectorAll("th") || [])];
    if (headers.length < 2) return;

    const names = headers.map((th) => th.textContent.trim());
    const tableId = names.join("|");
    const hidden = new Set(getHiddenTableColumns(wikiId, articlePath, tableId));

    const bar = document.createElement("div");
    bar.className = "table-col-toggles";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Visible comparison columns");

    names.forEach((name, idx) => {
      if (idx === 0) return;
      const isHidden = hidden.has(name);
      _setColumnHidden(table, idx, isHidden);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "table-col-toggle";
      btn.textContent = name;
      btn.setAttribute("aria-pressed", isHidden ? "false" : "true");
      btn.addEventListener("click", () => {
        const nextHidden = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", nextHidden ? "false" : "true");
        _setColumnHidden(table, idx, nextHidden);
        if (nextHidden) hidden.add(name);
        else hidden.delete(name);
        setHiddenTableColumns(wikiId, articlePath, tableId, [...hidden]);
      });
      bar.appendChild(btn);
    });

    const wrap = table.closest(".table-scroll-wrap") || table;
    wrap.parentNode.insertBefore(bar, wrap);
  });
}

export {
  addQuizTables,
  QuizMode,
  addTableSort,
  addTableScrollCues,
  addComparisonColumnToggles,
  extractComplexityTable,
};
