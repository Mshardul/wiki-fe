import { useEffect } from "react";

const isEditable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT");

// A focused control already activates on Space; toggling here too would cancel it out.
const isActivatable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && t.closest("button, a, [role='tab']") !== null;

interface VizHotkeys {
  toggle: () => void;
  step?: (delta: number) => void;
  variant?: (delta: number) => void;
  enabled?: boolean;
}

export function useVizHotkeys({ toggle, step, variant, enabled = true }: VizHotkeys): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      if (e.key === " ") {
        if (isActivatable(e.target)) return;
        e.preventDefault();
        toggle();
        return;
      }
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (dir === 0) return;
      if (e.shiftKey) {
        if (!variant) return;
        e.preventDefault();
        variant(dir);
      } else if (step) {
        e.preventDefault();
        step(dir);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, step, variant, enabled]);
}
