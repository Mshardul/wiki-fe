"use client";

import { useEffect } from "react";
import { getHiddenColumns, setHiddenColumns } from "@/lib/storage/table-columns";

interface ComparisonTableProps {
  wikiId: string;
  articlePath: string;
}

const WHOLE_NUM_RE = /^-?\d+(\.\d+)?$/;
const BIG_O_RE = /[OΘΩ]\s*\(([^)]*)\)/;

// Rough Big-O ordering; unknown forms fall back to string compare.
function bigORank(text: string): number | null {
  const m = text.match(BIG_O_RE);
  if (!m) return null;
  const inner = (m[1] ?? "").replace(/\s+/g, "").toLowerCase();
  const table: Array<[RegExp, number]> = [
    [/^1$/, 0],
    [/^log\*?n?$/, 1],
    [/^√n$|^sqrt\(?n\)?$/, 2],
    [/^n$/, 3],
    [/^nlogn$/, 4],
    [/^n\^?2$|^n²$/, 5],
    [/^n\^?3$|^n³$/, 6],
    [/^2\^n$/, 7],
    [/^n!$/, 8],
  ];
  for (const [re, rank] of table) if (re.test(inner)) return rank;
  return 6.5;
}

function compare(a: string, b: string, numericHint: boolean): number {
  if (numericHint) {
    const ra = bigORank(a);
    const rb = bigORank(b);
    if (ra != null && rb != null) return ra - rb;
  }
  const na = WHOLE_NUM_RE.test(a);
  const nb = WHOLE_NUM_RE.test(b);
  if (na && nb) return Number(a) - Number(b);
  if (na) return -1;
  if (nb) return 1;
  return a.localeCompare(b, undefined, { numeric: true });
}

// Sort + column-toggle + scroll cues over table[data-comparison] (emitted by rehypeComparisonTable).
// Ported from js/content/tables.js addTableSort / addComparisonColumnToggles / addTableScrollCues.
export function ComparisonTable({ wikiId, articlePath }: ComparisonTableProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const cleanups: Array<() => void> = [];

    for (const table of root.querySelectorAll<HTMLTableElement>("table[data-comparison]")) {
      const headerRow = table.tHead?.rows[0] ?? table.rows[0];
      const ths = headerRow ? [...headerRow.querySelectorAll<HTMLTableCellElement>("th")] : [];
      if (!ths.length) continue;

      // sort
      let sortCol = -1;
      let asc = true;
      ths.forEach((th, colIdx) => {
        th.classList.add("sortable-th");
        th.setAttribute("role", "button");
        th.setAttribute("tabindex", "0");
        const numericHint = th.dataset.colNumeric === "true";
        const doSort = () => {
          if (sortCol === colIdx) asc = !asc;
          else {
            sortCol = colIdx;
            asc = true;
          }
          ths.forEach((h, i) => {
            h.classList.toggle("sort-asc", i === colIdx && asc);
            h.classList.toggle("sort-desc", i === colIdx && !asc);
          });
          const tbody = table.tBodies[0] ?? table;
          const rows = [...tbody.querySelectorAll("tr")].filter((r) => r.cells.length);
          rows.sort((a, b) => {
            const cmp = compare(
              a.cells[colIdx]?.textContent?.trim() ?? "",
              b.cells[colIdx]?.textContent?.trim() ?? "",
              numericHint,
            );
            return asc ? cmp : -cmp;
          });
          for (const r of rows) tbody.appendChild(r);
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            doSort();
          }
        };
        th.addEventListener("click", doSort);
        th.addEventListener("keydown", onKey);
        cleanups.push(() => {
          th.removeEventListener("click", doSort);
          th.removeEventListener("keydown", onKey);
        });
      });

      // column toggles
      const names = ths.map((th) => th.textContent?.trim() ?? "");
      const tableId = names.join("|");
      const hidden = new Set(getHiddenColumns(wikiId, articlePath, tableId));
      const setColHidden = (idx: number, h: boolean) => {
        for (const row of table.rows) row.cells[idx]?.classList.toggle("table-col-hidden", h);
      };

      const bar = document.createElement("div");
      bar.className = "table-col-toggles";
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Visible comparison columns");
      names.forEach((name, idx) => {
        if (idx === 0) return;
        setColHidden(idx, hidden.has(name));
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "table-col-toggle";
        btn.textContent = name;
        btn.setAttribute("aria-pressed", hidden.has(name) ? "false" : "true");
        btn.addEventListener("click", () => {
          const nowHidden = btn.getAttribute("aria-pressed") === "true";
          btn.setAttribute("aria-pressed", nowHidden ? "false" : "true");
          setColHidden(idx, nowHidden);
          if (nowHidden) hidden.add(name);
          else hidden.delete(name);
          setHiddenColumns(wikiId, articlePath, tableId, [...hidden]);
        });
        bar.appendChild(btn);
      });

      // scroll cue
      const wrap = document.createElement("div");
      wrap.className = "table-scroll-wrap";
      table.parentNode?.insertBefore(wrap, table);
      wrap.appendChild(table);
      wrap.parentNode?.insertBefore(bar, wrap);
      const updateCue = () => {
        const overflows = wrap.scrollWidth > wrap.clientWidth + 4;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
        wrap.classList.toggle("scroll-cue", overflows && !atEnd);
      };
      wrap.addEventListener("scroll", updateCue, { passive: true });
      const ro = new ResizeObserver(updateCue);
      ro.observe(wrap);
      updateCue();
      cleanups.push(() => {
        ro.disconnect();
        bar.remove();
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, [wikiId, articlePath]);

  return null;
}
