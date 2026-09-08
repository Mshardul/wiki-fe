"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { verticalRegistry } from "@/lib/content/verticals";
import { Modal } from "../common/Modal";

interface WikiSwitcherProps {
  open: boolean;
  onClose: () => void;
  currentVertical?: string;
}

// Ported from js/app/wiki-switcher.js.
export function WikiSwitcher({ open, onClose, currentVertical }: WikiSwitcherProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const verticals = verticalRegistry();

  useEffect(() => {
    if (!open) return;
    const active =
      listRef.current?.querySelector<HTMLElement>(".wiki-switcher-card--active") ??
      listRef.current?.querySelector<HTMLElement>(".wiki-switcher-card");
    active?.focus();
  }, [open]);

  function select(id: string) {
    onClose();
    router.push(`/${id}/`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Switch wiki"
      className="wiki-switcher-modal"
      backdropClassName="wiki-switcher-backdrop"
    >
      <div ref={listRef} className="wiki-switcher-list">
        {verticals.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`wiki-switcher-card${v.id === currentVertical ? " wiki-switcher-card--active" : ""}`}
            onClick={() => select(v.id)}
          >
            <span className="wiki-switcher-card-icon">{v.icon}</span>
            <span className="wiki-switcher-card-body">
              <span className="wiki-switcher-card-name">{v.title}</span>
              {v.description && <span className="wiki-switcher-card-desc">{v.description}</span>}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
