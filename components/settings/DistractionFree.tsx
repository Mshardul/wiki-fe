"use client";

import { useEffect } from "react";

export function DistractionFree() {
  useEffect(() => {
    const toggle = () => document.body.classList.toggle("distraction-free");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.body.classList.contains("distraction-free")) {
        document.body.classList.remove("distraction-free");
      }
    };
    document.addEventListener("wiki:toggle-distraction-free", toggle);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("wiki:toggle-distraction-free", toggle);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("distraction-free");
    };
  }, []);

  return null;
}
