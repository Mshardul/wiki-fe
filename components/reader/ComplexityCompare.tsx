"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { BASE_PATH } from "@/lib/config";
import {
  type ComplexityTable,
  DS_SECTION_HEADING,
  MAX_PICKS,
  type MergedMatrix,
  mergeComplexityMatrices,
} from "@/lib/reader/complexity-matrix";
import { _clearDataJsonCache, loadDataJson } from "@/lib/storage/data-json";

interface Structure {
  title: string;
  /** Key into complexity-tables.json, e.g. data-structures/array */
  tableKey: string;
}

interface MatrixView {
  found: { title: string; table: ComplexityTable }[];
  merged: MergedMatrix;
}

let structuresCache: Structure[] | null = null;

function tableKeyFromPath(path: string): string {
  return path.replace(/^\.\/content\/dsa\//, "").replace(/\.md$/, "");
}

/** Only cache a non-empty list so a transient fetch failure can retry (WIKI-571). */
async function loadDsStructures(): Promise<Structure[]> {
  if (structuresCache) return structuresCache;
  try {
    const res = await fetch(`${BASE_PATH}/data/search-index.json`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      dsa?: { heading: string; cards: { title: string; path: string }[] }[];
    };
    const section = (data.dsa ?? []).find((s) => s.heading === DS_SECTION_HEADING);
    const structures = (section?.cards ?? []).map((c) => ({
      title: c.title,
      tableKey: tableKeyFromPath(c.path),
    }));
    if (structures.length) structuresCache = structures;
    return structures;
  } catch {
    return [];
  }
}

export function _clearStructuresCacheForTests(): void {
  structuresCache = null;
}

export function ComplexityCompare() {
  const [open, setOpen] = useState(false);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("");
  const [matrix, setMatrix] = useState<MatrixView | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => {
      setFilter("");
      setPicked(new Set());
      setStatus("");
      setMatrix(null);
      setOpen(true);
    };
    document.addEventListener("wiki:open-complexity-compare", onOpen);
    return () => document.removeEventListener("wiki:open-complexity-compare", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadDsStructures().then(setStructures);
  }, [open]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return structures.filter((s) => !q || s.title.toLowerCase().includes(q));
  }, [structures, filter]);

  function togglePick(tableKey: string, checked: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_PICKS) return prev;
        next.add(tableKey);
      } else {
        next.delete(tableKey);
      }
      return next;
    });
  }

  async function runCompare() {
    setStatus("Loading complexity tables…");
    // Bust a prior empty loadDataJson cache so a recovered fetch is visible.
    _clearDataJsonCache();
    const tables = await loadDataJson("complexity-tables");
    const chosen = structures.filter((s) => picked.has(s.tableKey));
    const results = chosen.map((s) => ({
      title: s.title,
      table: tables[s.tableKey] ?? null,
    }));
    const found = results.filter((r): r is { title: string; table: ComplexityTable } => !!r.table);

    if (!found.length) {
      setStatus("No complexity tables found for the selected structures.");
      setMatrix(null);
      return;
    }

    setMatrix({ found, merged: mergeComplexityMatrices(found) });
    const missing = results.length - found.length;
    setStatus(
      missing
        ? `${found.length} of ${results.length} structures had a complexity table (${missing} skipped).`
        : `Comparing ${found.length} structures.`,
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      label="Complexity comparator"
      className="link-graph-dialog compare-dialog"
      backdropClassName="link-graph-modal"
      initialFocusRef={searchRef}
    >
      <div className="link-graph-header">
        <span className="link-graph-title">Compare complexity</span>
        <span className="link-graph-status" id="compare-status">
          {status}
        </span>
        <button
          id="compare-close"
          className="link-graph-close-btn"
          type="button"
          aria-label="Close comparator"
          onClick={close}
        >
          ✕
        </button>
      </div>
      <div className="compare-body">
        <input
          ref={searchRef}
          id="compare-search-input"
          className="compare-search-input"
          type="text"
          placeholder="Filter data structures…"
          aria-label="Filter data structures"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div
          id="compare-picker-list"
          data-testid="compare-picker-list"
          className="compare-picker-list"
        >
          {visible.map((s) => {
            const checked = picked.has(s.tableKey);
            const disabled = !checked && picked.size >= MAX_PICKS;
            return (
              <label key={s.tableKey} className="compare-picker-item">
                <input
                  type="checkbox"
                  aria-label={s.title}
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => togglePick(s.tableKey, e.target.checked)}
                />
                <span>{s.title}</span>
              </label>
            );
          })}
        </div>
        <button
          id="compare-run-btn"
          className="compare-run-btn"
          type="button"
          disabled={picked.size < 2}
          onClick={() => void runCompare()}
        >
          {`Compare (${picked.size})`}
        </button>
        <div id="compare-matrix-wrap" className="compare-matrix-wrap">
          {matrix && (
            <table className="complexity-compare-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  {matrix.found.map((r) => (
                    <th key={r.title} colSpan={r.table.columns.length}>
                      {r.title}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th />
                  {matrix.merged.cols.map((c) => (
                    <th key={`${c.structureTitle}:${c.column}`}>{c.column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.merged.operations.map((op) => (
                  <tr key={op}>
                    <td>{op}</td>
                    {matrix.merged.cols.map((c) => (
                      <td key={`${op}:${c.structureTitle}:${c.column}`}>
                        {matrix.merged.cell(op, c.structureTitle, c.column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
