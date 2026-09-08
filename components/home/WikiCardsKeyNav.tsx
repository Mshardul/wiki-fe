"use client";

import { useEffect } from "react";

// Arrow-key navigation across the home .wiki-card grid. Ported from js/render/home-index.js key nav.
export function WikiCardsKeyNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const focused = document.activeElement as HTMLElement | null;
      const card = focused?.closest<HTMLElement>(".wiki-card");
      const grid = card?.closest<HTMLElement>(".wiki-grid");
      if (!card || !grid) return;
      const cards = [...grid.querySelectorAll<HTMLElement>(".wiki-card")];
      const idx = cards.indexOf(card);
      const next =
        e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? Math.max(idx - 1, 0)
          : Math.min(idx + 1, cards.length - 1);
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
