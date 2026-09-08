"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function walkTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      const tag = node.parentNode?.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "MARK") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const out: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

function offsetToPoint(nodes: Text[], target: number): { node: Text; offset: number } | null {
  let offset = 0;
  for (const n of nodes) {
    const len = n.nodeValue?.length ?? 0;
    if (offset + len > target) return { node: n, offset: target - offset };
    offset += len;
  }
  return null;
}

// In-article find bar. Ported from js/content/formatting.js ArticleFind — Range-wraps matches
// in place so island widgets survive, next/prev, live count.
export function ArticleFind() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(-1);
  const [total, setTotal] = useState(0);
  const hitsRef = useRef<HTMLElement[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearHits = useCallback(() => {
    const body = document.querySelector(".markdown-body");
    for (const m of body?.querySelectorAll("mark.article-find-hit") ?? []) {
      const parent = m.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
      parent.normalize();
    }
    hitsRef.current = [];
  }, []);

  const highlight = useCallback(
    (q: string) => {
      clearHits();
      const body = document.querySelector<HTMLElement>(".markdown-body");
      if (!body || q.trim().length < 1) {
        setTotal(0);
        setIdx(-1);
        return;
      }
      const ql = q.trim().toLowerCase();
      const nodes = walkTextNodes(body);
      const full = nodes
        .map((n) => n.nodeValue ?? "")
        .join("")
        .toLowerCase();
      const starts: number[] = [];
      let pos = full.indexOf(ql);
      while (pos !== -1) {
        starts.push(pos);
        pos = full.indexOf(ql, pos + 1);
      }

      const hits: HTMLElement[] = [];
      for (let i = starts.length - 1; i >= 0; i--) {
        const live = walkTextNodes(body);
        const s = offsetToPoint(live, starts[i] ?? 0);
        const e = offsetToPoint(live, (starts[i] ?? 0) + ql.length);
        if (!s || !e) continue;
        const range = document.createRange();
        range.setStart(s.node, s.offset);
        range.setEnd(e.node, e.offset);
        const mark = document.createElement("mark");
        mark.className = "article-find-hit";
        try {
          range.surroundContents(mark);
        } catch {
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
        }
        hits.unshift(mark);
      }
      hitsRef.current = hits;
      setTotal(hits.length);
      setIdx(hits.length ? 0 : -1);
    },
    [clearHits],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    return () => clearHits();
  }, [open, clearHits]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => highlight(query), 120);
    return () => clearTimeout(t);
  }, [query, open, highlight]);

  const closeBar = () => {
    setOpen(false);
    setQuery("");
    setTotal(0);
    setIdx(-1);
  };

  useEffect(() => {
    const hits = hitsRef.current;
    hits.forEach((h, i) => h.classList.toggle("article-find-hit--current", i === idx));
    hits[idx]?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [idx, total]);

  const move = (delta: number) => {
    if (!total) return;
    setIdx((cur) => (cur + delta + total) % total);
  };

  if (!open) return null;

  return (
    <div id="article-find" className="article-find" role="search">
      <input
        ref={inputRef}
        type="text"
        id="article-find-input"
        className="article-find-input"
        placeholder="Find in article…"
        aria-label="Find in article"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            move(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            closeBar();
          }
        }}
      />
      <span id="article-find-count" className="article-find-count" aria-live="polite">
        {query.trim() ? (total ? `${idx + 1}/${total}` : "0/0") : ""}
      </span>
      <button
        type="button"
        className="article-find-btn"
        aria-label="Previous match"
        onClick={() => move(-1)}
      >
        <svg className="icon" aria-hidden="true">
          <use href="#icon-chevron-up" />
        </svg>
      </button>
      <button
        type="button"
        className="article-find-btn"
        aria-label="Next match"
        onClick={() => move(1)}
      >
        <svg className="icon" aria-hidden="true">
          <use href="#icon-chevron-down" />
        </svg>
      </button>
      <button type="button" className="article-find-btn" aria-label="Close find" onClick={closeBar}>
        <svg className="icon" aria-hidden="true">
          <use href="#icon-x" />
        </svg>
      </button>
    </div>
  );
}
