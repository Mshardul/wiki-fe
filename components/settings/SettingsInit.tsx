"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { anyOpen } from "@/components/common/modalRegistry";
import { bindHotkeys } from "@/lib/hotkeys";
import {
  applySettings,
  bindOsThemeListener,
  getSettings,
  subscribeSettings,
} from "@/lib/storage/settings";

export function SettingsInit() {
  const pathname = usePathname() ?? "/";
  const ctxRef = useRef({
    isArticle: false,
    anyModalOpen: anyOpen,
  } as ReturnType<Parameters<typeof bindHotkeys>[0]>);

  useEffect(() => {
    applySettings(getSettings());
    const unsubSettings = subscribeSettings(() => applySettings(getSettings()));
    const unbindOs = bindOsThemeListener();
    const unbindKeys = bindHotkeys(() => ctxRef.current);
    return () => {
      unsubSettings();
      unbindOs();
      unbindKeys();
    };
  }, []);

  useEffect(() => {
    const segs = pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    const isArticle = segs.length >= 2;
    const el = document.getElementById("markdown-body");
    ctxRef.current = isArticle
      ? {
          isArticle: true,
          article: {
            verticalId: segs[0] ?? "",
            path: `content/${segs.join("/")}.md`,
            title: el?.querySelector("h1")?.textContent ?? "",
          },
          anyModalOpen: anyOpen,
        }
      : { isArticle: false, anyModalOpen: anyOpen };
  }, [pathname]);

  return null;
}
