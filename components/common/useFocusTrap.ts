import { type RefObject, useEffect } from "react";

const FOCUSABLE =
  "button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]";

export function getFocusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
}

// Cycles Tab focus within `ref` while `active`. Ported from js/modal-registry.js createFocusTrap.
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;
      const els = getFocusableIn(el);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    el.addEventListener("keydown", onKeydown);
    return () => el.removeEventListener("keydown", onKeydown);
  }, [ref, active]);
}
