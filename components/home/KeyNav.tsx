"use client";

import { useEffect } from "react";

// Arrow-key navigation across .index-card elements within a section. Ported from
// js/render/home-index.js _indexCardKeyNav.
export function KeyNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== "ArrowDown" &&
        e.key !== "ArrowUp" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight"
      )
        return;
      const focused = document.activeElement as HTMLElement | null;
      const card = focused?.closest<HTMLElement>(".index-card");
      if (!card) return;
      const section = card.closest<HTMLElement>(".index-section");
      if (!section) return;
      const cards = [...section.querySelectorAll<HTMLElement>(".index-card")];
      const idx = cards.indexOf(card);
      if (idx === -1) return;

      let next = idx;
      if (e.key === "ArrowDown" || e.key === "ArrowRight")
        next = Math.min(idx + 1, cards.length - 1);
      else next = Math.max(idx - 1, 0);
      if (next !== idx) {
        e.preventDefault();
        cards[next]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
