"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function depthOf(pathname: string): number {
  const segs = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  if (segs.length === 0) return 0;
  if (segs[0] === "offline") return 1;
  return Math.min(segs.length, 2);
}

export function NavTransition() {
  const pathname = usePathname() ?? "/";
  const lastDepth = useRef<number | null>(null);

  useEffect(() => {
    const depth = depthOf(pathname);
    const prev = lastDepth.current;
    lastDepth.current = depth;
    if (prev === null) return; // boot — nothing to slide from

    const direction = depth > prev ? "forward" : depth < prev ? "back" : null;
    const root = document.documentElement;
    root.classList.toggle("nav-forward", direction === "forward");
    root.classList.toggle("nav-back", direction === "back");
    root.setAttribute("data-nav-direction", direction ?? "");

    const clear = setTimeout(() => {
      root.classList.remove("nav-forward", "nav-back");
      root.removeAttribute("data-nav-direction");
    }, 300);
    return () => clearTimeout(clear);
  }, [pathname]);

  return null;
}
