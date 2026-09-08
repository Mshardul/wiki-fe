"use client";

import { useEffect, useState } from "react";

function scrollFraction(): number {
  const doc = document.documentElement;
  const scrolled = doc.scrollTop || document.body.scrollTop;
  const total = doc.scrollHeight - doc.clientHeight;
  return total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 1;
}

// 0..1 page scroll fraction, updated on scroll + resize.
export function useScrollProgress(): number {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => setPct(scrollFraction());
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return pct;
}
