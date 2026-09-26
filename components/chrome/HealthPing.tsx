"use client";

import { useEffect } from "react";
import { pingHealth } from "@/lib/api";

const INTERVAL_MS = 5 * 60 * 1000;

// Warms the wiki-be cold start.
export function HealthPing() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      pingHealth();
      timer = setInterval(pingHealth, INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
