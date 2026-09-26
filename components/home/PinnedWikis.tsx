"use client";

import { useEffect } from "react";
import {
  getPinnedWikis,
  sortByPin,
  subscribePinnedWikis,
  togglePinnedWiki,
} from "@/lib/storage/pinned-wikis";

export function PinnedWikis() {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>(".wiki-grid");
    if (!grid) return;

    const apply = () => {
      const wraps = [...grid.querySelectorAll<HTMLElement>(".wiki-card-wrap")];
      const pinned = new Set(getPinnedWikis());
      for (const wrap of wraps) {
        const id = wrap.dataset.wikiId ?? "";
        const btn = wrap.querySelector<HTMLButtonElement>(".wiki-card-pin-btn");
        if (btn) {
          const on = pinned.has(id);
          btn.classList.toggle("pinned", on);
          btn.textContent = on ? "★" : "☆";
          btn.setAttribute(
            "aria-label",
            `${on ? "Unpin" : "Pin"} ${wrap.querySelector(".wiki-card-title")?.textContent ?? ""}`,
          );
        }
      }
      for (const item of sortByPin(wraps.map((el) => ({ id: el.dataset.wikiId ?? "", el })))) {
        grid.appendChild(item.el);
      }
    };

    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(".wiki-card-pin-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = btn.closest<HTMLElement>(".wiki-card-wrap")?.dataset.wikiId;
      if (id) togglePinnedWiki(id);
    };

    apply();
    grid.addEventListener("click", onClick, { capture: true });
    const unsub = subscribePinnedWikis(apply);
    return () => {
      grid.removeEventListener("click", onClick, { capture: true });
      unsub();
    };
  }, []);

  return null;
}
