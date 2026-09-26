"use client";

import { useEffect, useRef } from "react";
import { type BeforeInstallPromptEvent, isStandalone } from "@/lib/pwa/install";
import { showToast } from "@/lib/toast";

export function InstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      showToast("Install this wiki for offline access and quicker launch.", {
        durationMs: 8000,
        priority: -1,
        actionLabel: "Install",
        onUndo: () => {
          void (async () => {
            await deferred.current?.prompt();
            await deferred.current?.userChoice;
            deferred.current = null;
          })();
        },
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return null;
}
