"use client";

import { useEffect } from "react";
import { pullAll } from "@/lib/storage/sync";

const THRESHOLD = 70;
const MAX = 120;

// At scrollTop 0, drag down past the threshold → revalidate synced domains. Ported from
// js/render/home-gestures.js bindIndexPullToRefresh.
export function PullToRefresh() {
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(".index-sections");
    if (!container) return;

    let startY = 0;
    let pulling = false;
    let dy = 0;

    const first = (list: TouchList) => list[0] as Touch;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1) return;
      startY = first(e.touches).clientY;
      pulling = true;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling || e.touches.length !== 1) return;
      dy = first(e.touches).clientY - startY;
      if (dy <= 0) {
        container.classList.remove("index-pulling");
        container.style.transform = "";
        return;
      }
      e.preventDefault();
      container.classList.add("index-pulling");
      container.style.transform = `translateY(${Math.min(dy, MAX)}px)`;
    };
    const end = () => {
      if (!pulling) return;
      pulling = false;
      container.classList.remove("index-pulling");
      container.style.transform = "";
      if (dy >= THRESHOLD) {
        void pullAll();
        document.dispatchEvent(new CustomEvent("wiki:index-refreshed"));
      }
      dy = 0;
    };

    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchmove", onMove, { passive: false });
    container.addEventListener("touchend", end, { passive: true });
    container.addEventListener("touchcancel", end, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", end);
      container.removeEventListener("touchcancel", end);
    };
  }, []);

  return null;
}
