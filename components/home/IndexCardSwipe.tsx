"use client";

import { useEffect } from "react";
import { toggleBookmark } from "@/lib/storage/bookmarks";
import { showToast } from "@/lib/toast";

const SWIPE_THRESHOLD = 50;
const DEADZONE = 8;
const MOBILE_MAX = 900;

interface IndexCardSwipeProps {
  wikiId: string;
}

// Mobile swipe-right on an index card → bookmark toggle. Ported from js/render/home-gestures.js bindIndexCardSwipe.
export function IndexCardSwipe({ wikiId }: IndexCardSwipeProps) {
  useEffect(() => {
    if (window.innerWidth > MOBILE_MAX) return;
    const container = document.querySelector<HTMLElement>(".index-sections");
    if (!container) return;

    let card: HTMLElement | null = null;
    let sx = 0;
    let sy = 0;
    let axis: "x" | "y" | null = null;

    const reset = () => {
      if (card) {
        card.style.transition = "transform 180ms ease";
        card.style.transform = "";
        card.classList.remove("card-swiping", "swipe-right", "swipe-left");
        const c = card;
        setTimeout(() => {
          c.style.transition = "";
        }, 200);
      }
      card = null;
      axis = null;
    };

    const first = (list: TouchList) => list[0] as Touch;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>(".index-card");
      if (!el || el.classList.contains("index-card--unavailable")) return;
      card = el;
      sx = first(e.touches).clientX;
      sy = first(e.touches).clientY;
      axis = null;
      card.style.transition = "";
    };
    const onMove = (e: TouchEvent) => {
      if (!card || e.touches.length !== 1) return;
      const dx = first(e.touches).clientX - sx;
      const dy = first(e.touches).clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        if (axis === "x") card.classList.add("card-swiping");
        else {
          card = null;
          return;
        }
      }
      if (axis === "x") {
        e.preventDefault();
        card.style.transform = `translateX(${dx}px)`;
        card.classList.toggle("swipe-right", dx > 0);
        card.classList.toggle("swipe-left", dx < 0);
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!card || axis !== "x") return reset();
      const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
      const path = card.dataset.articlePath;
      if (path && dx > SWIPE_THRESHOLD) {
        const now = toggleBookmark(
          wikiId,
          path,
          card.querySelector(".index-card-title")?.textContent ?? undefined,
        );
        showToast(now ? "Bookmarked" : "Bookmark removed");
      }
      reset();
    };

    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchmove", onMove, { passive: false });
    container.addEventListener("touchend", onEnd, { passive: true });
    container.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", onEnd);
      container.removeEventListener("touchcancel", reset);
    };
  }, [wikiId]);

  return null;
}
