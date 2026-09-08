"use client";

import { useEffect } from "react";

function scrollToId(id: string, behavior: ScrollBehavior) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior, block: "start" });
  return true;
}

// Wires in-article hash links (emitted by rehype-autolink-headings) to smooth-scroll + update the URL,
// and honours a ?a=<id> deep link on mount. Ported from js/content/toc.js jumpToHeading + addAnchorLinks.
export function AnchorScroll() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const deepLink = new URL(location.href).searchParams.get("a");
    if (deepLink) requestAnimationFrame(() => scrollToId(deepLink, "auto"));

    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || !root.contains(link)) return;
      const id = decodeURIComponent(link.getAttribute("href")?.slice(1) ?? "");
      if (!id || !scrollToId(id, "smooth")) return;
      e.preventDefault();
      const url = new URL(location.href);
      url.searchParams.set("a", id);
      history.pushState(history.state, "", url.toString());
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return null;
}
