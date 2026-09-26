"use client";

import { useEffect } from "react";
import { anyOpen, closeTopmost } from "@/components/common/modalRegistry";
import { isCardSwipeActive } from "./gestureState";

const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 44;
const DEADZONE = 8;
const MOBILE_MAX = 900;

function axisLock(dx: number, dy: number): "x" | "y" | null {
  if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return null;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
}

export function SwipeGestures() {
  useEffect(() => {
    let sx = 0;
    let sy = 0;
    let axis: "x" | "y" | null = null;
    let fromLeftEdge = false;
    let fromRightEdge = false;
    let tracking = false;

    const isMobile = () => window.innerWidth <= MOBILE_MAX;

    const onStart = (e: TouchEvent) => {
      const inLightbox = (e.target as HTMLElement | null)?.closest?.("#zoom-overlay");
      if (!isMobile() || e.touches.length !== 1 || inLightbox) {
        tracking = false;
        return;
      }
      const t = e.touches[0] as Touch;
      sx = t.clientX;
      sy = t.clientY;
      axis = null;
      fromLeftEdge = sx <= EDGE_ZONE;
      fromRightEdge = sx >= window.innerWidth - EDGE_ZONE;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return;
      if (!axis) {
        const t = e.touches[0] as Touch;
        axis = axisLock(t.clientX - sx, t.clientY - sy);
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if (axis === "x") {
        if (isCardSwipeActive()) return; // an index-card swipe owns this gesture
        if (fromLeftEdge && dx > SWIPE_THRESHOLD) history.back();
        else if (fromRightEdge && dx < -SWIPE_THRESHOLD) {
          const onArticle = !!document.getElementById("markdown-body");
          if (onArticle) document.dispatchEvent(new CustomEvent("wiki:open-toc-drawer"));
        }
      } else if (axis === "y") {
        if (dy > SWIPE_THRESHOLD && (anyOpen() || sy < window.innerHeight / 3)) closeTopmost();
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  return null;
}
