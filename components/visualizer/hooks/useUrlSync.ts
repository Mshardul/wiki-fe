import { useEffect } from "react";
import type { FieldSection, InputValues } from "@/lib/visualizer/core/fields";
import { encodeState, type ViewMode } from "@/lib/visualizer/core/url-state";

const DEBOUNCE_MS = 300;

export function useUrlSync(
  sections: FieldSection[],
  values: InputValues,
  frame: number,
  rotated: boolean,
  view?: ViewMode,
): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const search = encodeState(sections, values, { frame, rotated, view });
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [sections, values, frame, rotated, view]);
}
