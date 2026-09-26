"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const onPrint = () => {
      const body = document.getElementById("markdown-body");
      if (body) {
        body.setAttribute("data-print-url", location.href);
        for (const s of body.querySelectorAll(".section--collapsed")) {
          s.classList.remove("section--collapsed");
          const sb = s.closest(".section")?.querySelector<HTMLElement>(":scope > .section-body");
          if (sb) sb.hidden = false;
        }
        for (const answer of body.querySelectorAll<HTMLElement>(".problem-answer[hidden]")) {
          answer.hidden = false;
        }
      }
      window.print();
    };
    document.addEventListener("wiki:print-article", onPrint);
    return () => document.removeEventListener("wiki:print-article", onPrint);
  }, []);

  return null;
}
