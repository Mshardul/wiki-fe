"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TOPBAR_H = 44;

export function useH1ScrolledPast(): boolean {
  const pathname = usePathname();
  const [past, setPast] = useState(false);

  // pathname dep re-binds to the new article's H1 on client nav (the topbar doesn't remount)
  useEffect(() => {
    const h1 = document.querySelector<HTMLHeadingElement>("#markdown-body h1");
    const update = () => setPast(h1 != null && h1.getBoundingClientRect().bottom < TOPBAR_H);
    update();
    if (!h1) return;

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return past;
}
