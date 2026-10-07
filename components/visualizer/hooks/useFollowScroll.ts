import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/visualizer/core/motion";

export const FOLLOW_IDLE_MS = 2000;
const POLL_MS = 250;
const USER_EVENTS = ["wheel", "touchstart", "touchmove", "pointerdown"] as const;

function isFollowIdle(since: number): boolean {
  return Date.now() - since > FOLLOW_IDLE_MS;
}

export function useFollowScroll(
  wrapRef: RefObject<HTMLElement | null>,
  index: number,
): { recenterNow: () => void } {
  const lastUser = useRef(Number.NEGATIVE_INFINITY);
  const indexRef = useRef(index);
  useLayoutEffect(() => {
    indexRef.current = index;
  });

  const center = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof wrap.scrollTo !== "function") return;
    const cell = wrap.querySelector<HTMLElement>(`[data-index="${indexRef.current}"]`);
    if (!cell) return;
    const target = cell.offsetLeft + cell.offsetWidth / 2 - wrap.clientWidth / 2;
    if (Math.abs(wrap.scrollLeft - target) <= 1) return;
    wrap.scrollTo({
      left: target,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [wrapRef]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mark = () => {
      lastUser.current = Date.now();
    };
    for (const ev of USER_EVENTS) wrap.addEventListener(ev, mark, { passive: true });
    return () => {
      for (const ev of USER_EVENTS) wrap.removeEventListener(ev, mark);
    };
  }, [wrapRef]);

  // index is the trigger; center reads the latest value through indexRef.
  useEffect(() => {
    if (isFollowIdle(lastUser.current)) center();
  }, [index, center]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (isFollowIdle(lastUser.current)) center();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [center]);

  const recenterNow = useCallback(() => {
    lastUser.current = Number.NEGATIVE_INFINITY;
  }, []);
  return { recenterNow };
}
