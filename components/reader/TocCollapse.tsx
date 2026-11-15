"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/types";
import { collapseKey, isCollapsed, setCollapsed } from "@/lib/storage/collapse";
import { subscribeKey } from "@/lib/storage/local";

interface TocCollapseProps {
  wikiId: string;
  articlePath: string;
  headings: Heading[];
}

export function TocCollapse({ wikiId, articlePath, headings }: TocCollapseProps) {
  const [collapsed, setCollapsedState] = useState(() => {
    const h2s = headings.filter((h) => h.depth === 2);
    return h2s.length > 0 && h2s.every((h) => isCollapsed(collapseKey(wikiId, articlePath, h.id)));
  });

  useEffect(() => {
    const h2s = headings.filter((h) => h.depth === 2);
    if (!h2s.length) return;

    const sync = () => {
      setCollapsedState(h2s.every((h) => isCollapsed(collapseKey(wikiId, articlePath, h.id))));
    };

    const cleanups = h2s.map((h) => subscribeKey(collapseKey(wikiId, articlePath, h.id), sync));
    return () => {
      for (const c of cleanups) c();
    };
  }, [headings, wikiId, articlePath]);

  const toggle = () => {
    const h2s = headings.filter((h) => h.depth === 2);
    const next = !collapsed;
    for (const h of h2s) {
      setCollapsed(collapseKey(wikiId, articlePath, h.id), next);
    }
    setCollapsedState(next);
  };

  if (!headings.some((h) => h.depth === 2)) return null;

  return (
    <button
      type="button"
      id="toc-collapse"
      className="toc-collapse"
      aria-label={collapsed ? "Expand all sections" : "Collapse all sections"}
      aria-expanded={!collapsed}
      onClick={toggle}
    >
      <svg className="icon" aria-hidden="true">
        <use href={collapsed ? "#icon-expand-all" : "#icon-collapse-all"} />
      </svg>
    </button>
  );
}
