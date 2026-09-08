"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "./lockBodyScroll";
import { type ModalEntry, markClosed, markOpened, registerModal } from "./modalRegistry";
import { useFocusTrap } from "./useFocusTrap";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  backdropClassName?: string;
  children: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function Modal({
  open,
  onClose,
  label,
  className,
  backdropClassName,
  children,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  const entryRef = useRef<ModalEntry>({
    isOpen: () => openRef.current,
    close: () => onCloseRef.current(),
  });

  useEffect(() => {
    onCloseRef.current = onClose;
    openRef.current = open;
  });

  useFocusTrap(dialogRef, open);

  useEffect(() => registerModal(entryRef.current), []);

  useEffect(() => {
    if (!open) return;
    const entry = entryRef.current;
    markOpened(entry);
    lockBodyScroll();
    const prevFocus = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? dialogRef.current)?.focus();

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeydown);

    return () => {
      document.removeEventListener("keydown", onKeydown);
      unlockBodyScroll();
      markClosed(entry);
      prevFocus?.focus();
    };
  }, [open, initialFocusRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={backdropClassName}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
