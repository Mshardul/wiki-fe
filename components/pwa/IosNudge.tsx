"use client";

import { useEffect } from "react";
import { dismissIosNudge, isIos, isIosNudgeDismissed, isStandalone } from "@/lib/pwa/install";
import { showToast } from "@/lib/toast";

export function IosNudge() {
  useEffect(() => {
    if (isStandalone() || !isIos() || isIosNudgeDismissed()) return;
    showToast("Add to Home Screen: tap Share, then “Add to Home Screen”.", {
      durationMs: 8000,
      priority: -1,
      actionLabel: "Got it",
      onUndo: dismissIosNudge,
    });
  }, []);

  return null;
}
