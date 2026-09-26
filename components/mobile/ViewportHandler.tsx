"use client";

import { useEffect } from "react";
import { anyOpen, closeTopmost } from "@/components/common/modalRegistry";

const DEBOUNCE_MS = 150;
const SIGNIFICANT_PX = 50;

export function ViewportHandler() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastWidth = window.innerWidth;

    const onResize = () => {
      clearTimeout(timer);
      // snapshot at resize-start, not debounce-fire, so a modal opened mid-debounce survives
      const wasOpenAtStart = anyOpen();
      timer = setTimeout(() => {
        const prev = lastWidth;
        const width = window.innerWidth;
        lastWidth = width;
        const changed = Math.abs(width - prev) > SIGNIFICANT_PX;

        if (changed) {
          if (wasOpenAtStart) closeTopmost();
          document
            .getElementById("hover-preview")
            ?.classList.remove("visible", "hover-preview--sheet-open");
          document.dispatchEvent(new CustomEvent("wiki:diagram-relayout"));
        }
      }, DEBOUNCE_MS);
    };

    window.addEventListener("resize", onResize, { passive: true });
    // visualViewport shifts when the mobile keyboard opens
    window.visualViewport?.addEventListener("resize", onResize, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
