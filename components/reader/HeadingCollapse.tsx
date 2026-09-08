"use client";

import { useEffect } from "react";
import { collapseKey, gcCollapseKeys, isCollapsed, setCollapsed } from "@/lib/storage/collapse";

interface HeadingCollapseProps {
  wikiId: string;
  articlePath: string;
}

function applyCollapsed(h2: HTMLElement, collapsed: boolean) {
  h2.classList.toggle("section--collapsed", collapsed);
  const body = h2.closest(".section")?.querySelector<HTMLElement>(":scope > .section-body");
  if (body) body.hidden = collapsed;
}

const ICON = '<svg class="icon" aria-hidden="true"><use href="#icon-chevron-down"></use></svg>';

// Adds a per-h2 collapse toggle over the pipeline-emitted .section markup, persisted per article.
// Ported from js/content/toc.js injectHeadingCollapseToggles.
export function HeadingCollapse({ wikiId, articlePath }: HeadingCollapseProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const liveIds: string[] = [];
    const cleanups: Array<() => void> = [];

    for (const h2 of root.querySelectorAll<HTMLElement>("h2")) {
      if (!h2.id || h2.querySelector(".heading-collapse-btn")) continue;
      liveIds.push(h2.id);
      const key = collapseKey(wikiId, articlePath, h2.id);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "heading-collapse-btn";
      btn.setAttribute("aria-label", "Toggle section");
      btn.innerHTML = ICON;
      h2.appendChild(btn);

      applyCollapsed(h2, isCollapsed(key));

      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        const next = !h2.classList.contains("section--collapsed");
        setCollapsed(key, next);
        applyCollapsed(h2, next);
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    }

    gcCollapseKeys(wikiId, articlePath, liveIds);
    return () => {
      for (const c of cleanups) c();
    };
  }, [wikiId, articlePath]);

  return null;
}
