"use client";

import { useEffect } from "react";

// Reveals the .caveat-body inside a .caveat-marker (emitted by rehypeGlossaryCaveatMarkers) on click / Enter / Space.
// Ported from js/content/glossary-caveats.js addInlineCaveats reveal half.
export function CaveatReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    function toggle(marker: HTMLElement) {
      const expanded = marker.getAttribute("aria-expanded") === "true";
      marker.setAttribute("aria-expanded", String(!expanded));
      marker.querySelector(".caveat-body")?.setAttribute("aria-hidden", String(expanded));
    }

    const onClick = (e: MouseEvent) => {
      const marker = (e.target as HTMLElement).closest<HTMLElement>(".caveat-marker");
      if (!marker || !root.contains(marker)) return;
      e.stopPropagation();
      toggle(marker);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const marker = (e.target as HTMLElement).closest<HTMLElement>(".caveat-marker");
      if (!marker || !root.contains(marker)) return;
      e.preventDefault();
      toggle(marker);
    };

    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeydown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return null;
}
