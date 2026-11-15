"use client";

import { useEffect, useMemo, useState } from "react";
import type { Heading } from "@/lib/content/types";
import { collapseKey, gcCollapseKeys, isCollapsed, setCollapsed } from "@/lib/storage/collapse";
import { subscribeKey } from "@/lib/storage/local";

interface TocProps {
  headings: Heading[];
  wikiId: string;
  articlePath: string;
}

interface TocGroup {
  h2: Heading;
  children: Heading[];
}

export function Toc({ headings, wikiId, articlePath }: TocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo<TocGroup[]>(() => {
    const out: TocGroup[] = [];
    let current: TocGroup | null = null;
    for (const h of headings) {
      if (h.depth === 2) {
        current = { h2: h, children: [] };
        out.push(current);
      } else if (current) {
        current.children.push(h);
      }
    }
    return out;
  }, [headings]);

  useEffect(() => {
    if (!groups.length) return;

    const liveIds = groups.map((g) => g.h2.id);
    const cleanups: Array<() => void> = [];

    const apply = () => {
      for (const g of groups) {
        const group = document.querySelector<HTMLElement>(
          `.toc-h2-group[data-section-id="${CSS.escape(g.h2.id)}"]`,
        );
        if (!group) continue;
        const collapsed = isCollapsed(collapseKey(wikiId, articlePath, g.h2.id));
        group.classList.toggle("section--collapsed", collapsed);
        group
          .querySelector<HTMLButtonElement>(".toc-group-chevron")
          ?.setAttribute("aria-expanded", String(!collapsed));
      }
    };

    apply();

    // Stay in sync with the in-content collapse in HeadingCollapse.tsx, which writes the same key.
    for (const g of groups) {
      cleanups.push(subscribeKey(collapseKey(wikiId, articlePath, g.h2.id), apply));
    }

    // Wire each group chevron to toggle its section, sharing the key above.
    for (const g of groups) {
      const group = document.querySelector<HTMLElement>(
        `.toc-h2-group[data-section-id="${CSS.escape(g.h2.id)}"]`,
      );
      const chevron = group?.querySelector<HTMLButtonElement>(".toc-group-chevron");
      if (!chevron) continue;
      const key = collapseKey(wikiId, articlePath, g.h2.id);
      const onClick = () => {
        const next = !group!.classList.contains("section--collapsed");
        setCollapsed(key, next);
        group!.classList.toggle("section--collapsed", next);
        chevron.setAttribute("aria-expanded", String(!next));
      };
      chevron.addEventListener("click", onClick);
      cleanups.push(() => chevron.removeEventListener("click", onClick));
    }

    gcCollapseKeys(wikiId, articlePath, liveIds);

    return () => {
      for (const c of cleanups) c();
    };
  }, [groups, wikiId, articlePath]);

  useEffect(() => {
    if (!headings.length) return;
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el != null);
    if (!targets.length) return;

    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const firstVisible = headings.find((h) => seen.get(h.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  function onClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const url = new URL(location.href);
    url.searchParams.set("a", id);
    history.replaceState(history.state, "", url.toString());
  }

  return (
    <nav id="toc-nav" className="toc-nav" aria-label="On this page">
      {groups.map((g) => (
        <div key={g.h2.id} className="toc-h2-group" data-section-id={g.h2.id}>
          <div className="toc-h2-row">
            <a
              href={`#${g.h2.id}`}
              className={`toc-item toc-h2${activeId === g.h2.id ? " toc-current" : ""}`}
              aria-current={activeId === g.h2.id ? "true" : undefined}
              onClick={(e) => onClick(e, g.h2.id)}
            >
              {g.h2.text}
            </a>
            <button
              type="button"
              className="toc-group-chevron"
              aria-label="Toggle section"
              aria-expanded="true"
            >
              <svg className="icon" aria-hidden="true">
                <use href="#icon-chevron-down" />
              </svg>
            </button>
          </div>
          {g.children.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={`toc-item toc-h${h.depth}${activeId === h.id ? " toc-current" : ""}`}
              aria-current={activeId === h.id ? "true" : undefined}
              onClick={(e) => onClick(e, h.id)}
            >
              {h.text}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
