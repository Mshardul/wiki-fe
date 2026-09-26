"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { anyOpen } from "@/components/common/modalRegistry";

export function EscapeToIndex({ verticalId }: { verticalId: string }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (anyOpen()) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // DistractionFree's own Escape listener registers after this one, so no-op here instead of racing it
      if (
        document.querySelector(".markdown-body.focus-mode") ||
        document.body.classList.contains("distraction-free") ||
        document.body.classList.contains("toc-open") ||
        document.querySelector("#article-find:not(.hidden), #zoom-overlay:not(.hidden)")
      ) {
        return;
      }
      router.push(`/${verticalId}/`);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, verticalId]);

  return null;
}
