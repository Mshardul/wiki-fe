"use client";

import { useEffect } from "react";

const COLLAPSE_LINES_DESKTOP = 10;
const COLLAPSE_LINES_MOBILE = 5;
const APPROX_LINE_HEIGHT_PX = 24;

// Adds a Show more / Show less toggle to tall or explicitly-collapsed callouts.
// Ported from js/content/formatting.js addCollapsibleCallouts. Markup from rehypeCallouts.
export function CalloutCollapse() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const lineLimit = window.innerWidth < 768 ? COLLAPSE_LINES_MOBILE : COLLAPSE_LINES_DESKTOP;
    const heightThreshold = lineLimit * APPROX_LINE_HEIGHT_PX;
    const cleanups: Array<() => void> = [];

    for (const bq of root.querySelectorAll<HTMLElement>("blockquote.callout")) {
      const startsCollapsed = bq.dataset.collapsed === "true";
      if (!startsCollapsed && bq.scrollHeight <= heightThreshold) continue;

      bq.classList.add("callout--collapsible");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "callout-expand-btn";
      btn.textContent = "Show more";
      const onClick = () => {
        const expanded = bq.classList.toggle("callout--expanded");
        btn.textContent = expanded ? "Show less" : "Show more";
      };
      btn.addEventListener("click", onClick);
      bq.insertAdjacentElement("afterend", btn);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        btn.remove();
        bq.classList.remove("callout--collapsible", "callout--expanded");
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
