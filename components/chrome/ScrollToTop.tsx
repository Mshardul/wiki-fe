"use client";

import { useEffect, useState } from "react";
import { useScrollProgress } from "@/components/common/useScrollProgress";

const SHOW_AFTER_PX = 300;
const RING_R = 17;
const RING_CIRC = 2 * Math.PI * RING_R;

// Back-to-top FAB. Its circular border is a progress ring whose fill tracks page scroll.
// Ported from js/app.js (button) + js/content/toc.js (progress ring).
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pct = useScrollProgress();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      id="scroll-top"
      className={`scroll-top-btn${visible ? " visible" : ""}`}
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className="scroll-top-ring" viewBox="0 0 42 42" aria-hidden="true">
        <circle className="scroll-top-ring-track" cx="21" cy="21" r={RING_R} fill="none" />
        <circle
          className="scroll-top-ring-fill"
          cx="21"
          cy="21"
          r={RING_R}
          fill="none"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={RING_CIRC * (1 - pct)}
        />
      </svg>
      <svg className="icon" aria-hidden="true">
        <use href="#icon-chevron-up" />
      </svg>
    </button>
  );
}
