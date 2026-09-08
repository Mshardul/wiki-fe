"use client";

import { useEffect, useState } from "react";

const TOPBAR_H = 44;

// Shows the section (h2) currently scrolled under the topbar. Ported from js/content/toc.js addStickySection.
export function StickyHeader() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const h2s = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(".markdown-body h2, #markdown-body h2"),
    );
    if (!h2s.length) return;

    const update = () => {
      const threshold = window.scrollY + TOPBAR_H + 2;
      let current: HTMLHeadingElement | null = null;
      for (const h of h2s) {
        if (h.getBoundingClientRect().top + window.scrollY <= threshold) current = h;
      }
      setLabel(current ? (current.textContent ?? "").replace(/#+\s*$/, "").trim() : null);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sticky-header-visible", label != null);
    return () => document.body.classList.remove("sticky-header-visible");
  }, [label]);

  return (
    <div
      id="sticky-section-header"
      className={`sticky-section-header${label ? " visible" : ""}`}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
