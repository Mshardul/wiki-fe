"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { anyOpen } from "@/components/common/modalRegistry";
import { bindHotkeys } from "@/lib/hotkeys";

const wikiSwitcherOpen = () => document.querySelector(".wiki-switcher-modal") != null;

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
    wikiSwitcherOpen,
  } as ReturnType<Parameters<typeof bindHotkeys>[0]>);

  useEffect(() => {
    applySettings(getSettings());
    const unsubSettings = subscribeSettings(() => applySettings(getSettings()));
    const unbindOs = bindOsThemeListener();
    const unbindKeys = bindHotkeys(() => ctxRef.current);
    // Hotkeys bind after hydration; automation waits on this to avoid pressing keys into the void.
    document.documentElement.dataset.hotkeysReady = "true";
    return () => {
      delete document.documentElement.dataset.hotkeysReady;
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
          wikiSwitcherOpen,
        }
      : { isArticle: false, anyModalOpen: anyOpen, wikiSwitcherOpen };
  }, [pathname]);

  return null;
}
