"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/common/Modal";
import { loadSearchEntries, routeFor } from "@/lib/search";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import {
  getFallbackSuggestions,
  type SearchEntry,
  scoreMatch,
  titleHighlightTerm,
} from "@/lib/search/score";
import { extractSnippet } from "@/lib/search/snippet";
import { loadSynonyms } from "@/lib/search/synonyms";
import {
  addRecentSearch,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/storage/recent-searches";

interface ResultGroup {
  verticalTitle: string;
  items: SearchEntry[];
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="gsearch-highlight">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [selected, setSelected] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const recents = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    () => [] as string[],
  );

  useEffect(() => {
    if (!open) return;
    void Promise.all([loadSearchEntries(), loadSynonyms()]).then(([e]) => setEntries(e));
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpenEvt = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("wiki:open-search", onOpenEvt);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wiki:open-search", onOpenEvt);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(-1);
  }, []);

  const raw = query.trim();
  const sectionMode = raw.startsWith(">");

  const { groups, sections, fallback, count } = useMemo(() => {
    if (!raw || !entries.length) {
      return { groups: [] as ResultGroup[], sections: [], fallback: null, count: 0 };
    }
    if (sectionMode) {
      const sq = raw.slice(1).trim().toLowerCase();
      const seen = new Map<
        string,
        { verticalTitle: string; section: string; items: SearchEntry[] }
      >();
      if (sq) {
        for (const e of entries) {
          const sl = e.section.toLowerCase();
          if (sl.includes(sq) || fuzzyMatch(sq, sl)) {
            const k = `${e.verticalId}::${e.section}`;
            if (!seen.has(k))
              seen.set(k, { verticalTitle: e.verticalTitle, section: e.section, items: [] });
            seen.get(k)?.items.push(e);
          }
        }
      }
      return { groups: [], sections: [...seen.values()], fallback: null, count: seen.size };
    }
    const scored = entries
      .map((e) => ({ e, score: scoreMatch(raw, e) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.e);

    if (!scored.length) {
      return {
        groups: [],
        sections: [],
        fallback: getFallbackSuggestions(raw, entries),
        count: 0,
      };
    }
    const byVertical = new Map<string, ResultGroup>();
    for (const e of scored) {
      if (!byVertical.has(e.verticalId))
        byVertical.set(e.verticalId, { verticalTitle: e.verticalTitle, items: [] });
      byVertical.get(e.verticalId)?.items.push(e);
    }
    return { groups: [...byVertical.values()], sections: [], fallback: null, count: scored.length };
  }, [raw, sectionMode, entries]);

  const flatItems = useMemo(
    () => (sectionMode ? sections.flatMap((s) => s.items) : groups.flatMap((g) => g.items)),
    [groups, sections, sectionMode],
  );

  const go = useCallback(
    (entry: SearchEntry) => {
      addRecentSearch(raw);
      close();
      router.push(routeFor(entry));
    },
    [raw, router, close],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => (i < flatItems.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => (i <= 0 ? -1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selected] ?? flatItems[0];
      if (item) go(item);
    }
  };

  let runningIdx = -1;

  return (
    <Modal
      open={open}
      onClose={close}
      label="Search"
      className={`gsearch-dialog${sectionMode ? " section-mode" : ""}`}
      backdropClassName="gsearch-modal"
      initialFocusRef={inputRef}
    >
      <div className="gsearch-input-wrap">
        <svg className="icon gsearch-icon" aria-hidden="true">
          <use href="#icon-search" />
        </svg>
        <span className="gsearch-mode-badge" aria-hidden="true">
          Filtering sections
        </span>
        <input
          ref={inputRef}
          type="text"
          className="gsearch-input"
          placeholder="Search all wikis…"
          aria-label="Search all wikis"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(-1);
          }}
          onKeyDown={onInputKey}
        />
        <span className="gsearch-count" aria-live="polite">
          {!sectionMode && count > 0 ? `${count} result${count === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      <div className="gsearch-results">
        {!raw && (
          <>
            {recents.length > 0 && (
              <div className="gsearch-recents">
                <div className="gsearch-group-label">Recent searches</div>
                <div className="gsearch-recents-chips">
                  {recents.slice(0, 5).map((q) => (
                    <div className="gsearch-recent-chip" key={q}>
                      <button
                        type="button"
                        className="gsearch-recent-query"
                        onClick={() => setQuery(q)}
                      >
                        {q}
                      </button>
                      <button
                        type="button"
                        className="gsearch-recent-remove"
                        aria-label={`Remove ${q}`}
                        onClick={() => removeRecentSearch(q)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="gsearch-empty">
              Type to search · <kbd className="gsearch-kbd">&gt;</kbd> sections
            </div>
          </>
        )}

        {raw &&
          sectionMode &&
          sections.map((s) => (
            <div key={`${s.verticalTitle}::${s.section}`}>
              <div className="gsearch-group-label">
                {s.verticalTitle} · {s.section}
              </div>
              {s.items.map((item) => {
                runningIdx += 1;
                const idx = runningIdx;
                return (
                  <button
                    type="button"
                    className={`gsearch-result${idx === selected ? " selected" : ""}`}
                    key={item.path}
                    onClick={() => go(item)}
                  >
                    <span className="gsearch-result-title">{item.title}</span>
                    <span className="gsearch-result-meta">{item.section}</span>
                  </button>
                );
              })}
            </div>
          ))}

        {raw &&
          !sectionMode &&
          groups.map((g) => (
            <div key={g.verticalTitle}>
              <div className="gsearch-group-label">{g.verticalTitle}</div>
              {g.items.map((item) => {
                runningIdx += 1;
                const idx = runningIdx;
                const term = titleHighlightTerm(item.title, raw);
                const snip = extractSnippet(item.description, raw);
                return (
                  <button
                    type="button"
                    className={`gsearch-result${idx === selected ? " selected" : ""}`}
                    key={item.path}
                    onClick={() => go(item)}
                  >
                    <span className="gsearch-result-title">
                      <Highlight text={item.title} term={term} />
                    </span>
                    <span className="gsearch-result-meta">{item.section}</span>
                    {snip && (
                      <span className="gsearch-result-snippet">
                        {snip.before}
                        {snip.match && <mark className="gsearch-highlight">{snip.match}</mark>}
                        {snip.after}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

        {raw && !sectionMode && fallback && (
          <>
            <div className="gsearch-no-results">
              No results for “<strong>{raw}</strong>”
            </div>
            {fallback.didYouMean && (
              <div className="gsearch-did-you-mean">
                Did you mean:{" "}
                <button
                  type="button"
                  className="gsearch-suggestion-btn"
                  onClick={() => setQuery(fallback.didYouMean ?? "")}
                >
                  {fallback.didYouMean}
                </button>
                ?
              </div>
            )}
            {fallback.fuzzy.length > 0 && (
              <>
                <div className="gsearch-group-label">You might be looking for</div>
                {fallback.fuzzy.map((item) => (
                  <button
                    type="button"
                    className="gsearch-result"
                    key={item.path}
                    onClick={() => go(item)}
                  >
                    <span className="gsearch-result-title">{item.title}</span>
                    <span className="gsearch-result-meta">{item.section}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
