"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/types";

interface TocProps {
  headings: Heading[];
}

// Builds the on-this-page nav from article.headings (no DOM walk, unlike js/content/toc.js buildTOC).
export function Toc({ headings }: TocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
      {headings.map((h) => (
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
    </nav>
  );
}
