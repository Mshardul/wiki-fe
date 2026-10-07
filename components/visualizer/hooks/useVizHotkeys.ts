import { useEffect } from "react";
import type { Playback } from "./usePlayback";

const isEditable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT");

// A focused control already activates on Space; toggling here too would cancel it out.
const isActivatable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && t.closest("button, a, [role='tab']") !== null;

export function useVizHotkeys({ toggle, step }: Pick<Playback, "toggle" | "step">): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      if (e.key === " ") {
        if (isActivatable(e.target)) return;
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, step]);
}
