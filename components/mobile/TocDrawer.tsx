"use client";

import { useEffect, useRef, useState } from "react";
import {
  type ModalEntry,
  markClosed,
  markOpened,
  registerModal,
} from "@/components/common/modalRegistry";

export function TocDrawer() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const entryRef = useRef<ModalEntry>({
    isOpen: () => openRef.current,
    close: () => setOpen(false),
  });

  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => registerModal(entryRef.current), []);

  useEffect(() => {
    const entry = entryRef.current;
    const sidebar = document.getElementById("toc-sidebar");
    sidebar?.classList.toggle("mobile-open", open);
    document.body.classList.toggle("toc-open", open);
    if (open) markOpened(entry);
    else markClosed(entry);
    return () => {
      sidebar?.classList.remove("mobile-open");
      document.body.classList.remove("toc-open");
      markClosed(entry);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openRef.current) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const onNavClick = (e: Event) => {
      if ((e.target as HTMLElement).closest(".toc-item")) setOpen(false);
    };
    const onOpenEvt = () => {
      if (document.querySelector("#toc-nav .toc-item")) setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("wiki:open-toc-drawer", onOpenEvt);
    const nav = document.getElementById("toc-nav");
    nav?.addEventListener("click", onNavClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wiki:open-toc-drawer", onOpenEvt);
      nav?.removeEventListener("click", onNavClick);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        id="toc-mobile-btn"
        className="toc-mobile-btn"
        title="Table of contents"
        aria-label="Table of contents"
        aria-expanded={open}
        onClick={() => {
          if (!document.querySelector("#toc-nav .toc-item")) return;
          setOpen((v) => !v);
        }}
      >
        <svg className="icon" aria-hidden="true">
          <use href="#icon-menu" />
        </svg>
      </button>
      <div
        id="toc-mobile-backdrop"
        className={`toc-mobile-backdrop${open ? "" : " hidden"}`}
        onClick={() => setOpen(false)}
        role="presentation"
      />
    </>
  );
}
