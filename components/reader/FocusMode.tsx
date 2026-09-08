"use client";

import { useEffect } from "react";

const FOCUS_SELECTORS = "p, li, blockquote, pre, h2, h3";

interface FocusModeProps {
  active: boolean;
}

// Dims everything outside the central reading band while active. Ported from js/content/formatting.js toggleFocusMode.
export function FocusMode({ active }: FocusModeProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root || !active) return;

    root.classList.add("focus-mode");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("focus-para", e.isIntersecting);
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );
    for (const el of root.querySelectorAll(FOCUS_SELECTORS)) observer.observe(el);

    return () => {
      observer.disconnect();
      root.classList.remove("focus-mode");
      for (const el of root.querySelectorAll(".focus-para")) el.classList.remove("focus-para");
    };
  }, [active]);

  return null;
}
