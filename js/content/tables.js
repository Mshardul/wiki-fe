import { state } from "../state.js";
import { recordReveal } from "../storage/read-tracking.js";

/* ─── Quiz-me mode for complexity tables ─── */

const COMPLEXITY_HEADER_RE = /\b(time|space|complexity|best|worst|average)\b/i;
const BIG_O_RE = /[OΘΩ]\s*\(/;

function _isQuizzableTable(table) {
  const headText = table.querySelector("thead, tr")?.textContent || "";
  if (COMPLEXITY_HEADER_RE.test(headText)) return true;
  return [...table.querySelectorAll("td")].some((td) => BIG_O_RE.test(td.textContent));
}

function addQuizTables(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    if (!_isQuizzableTable(table)) return;
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

const QuizMode = {
  active: false,

  toggle() {
    const tables = document.querySelectorAll("#markdown-body .quiz-table");
    if (!tables.length) return;
    this.active = !this.active;
    document.querySelectorAll("#markdown-body .quiz-cell").forEach((td) => {
      td.classList.toggle("quiz-blurred", this.active);
    });
  },

  bind(contentEl) {
    contentEl.addEventListener("click", (e) => {
      const td = e.target.closest(".quiz-cell.quiz-blurred");
      if (td) _revealQuizCell(td);
    });
  },

  reset() {
    this.active = false;
  },
};

/* ─── Table Column Sort ─── */
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
          const aNum = Number.parseFloat(aText);
          const bNum = Number.parseFloat(bText);
          const cmp =
            !Number.isNaN(aNum) && !Number.isNaN(bNum)
              ? aNum - bNum
              : aText.localeCompare(bText, undefined, { numeric: true });
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

/* ─── Table Scroll Cue ─── */
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

export { addQuizTables, QuizMode, addTableSort, addTableScrollCues };
