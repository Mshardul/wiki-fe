import { useCallback, useState } from "react";
import {
  getVisualizerPanels,
  type PanelPrefs,
  setVisualizerPanels,
} from "@/lib/storage/visualizer-prefs";

const NARROW_PX = 1200;

export interface PanelState extends PanelPrefs {
  toggle: (side: keyof PanelPrefs) => void;
}

export function usePanelPrefs(): PanelState {
  const [prefs, setPrefs] = useState<PanelPrefs>(
    () => getVisualizerPanels() ?? { left: false, right: window.innerWidth < NARROW_PX },
  );
  const toggle = useCallback(
    (side: keyof PanelPrefs) => {
      const next = { ...prefs, [side]: !prefs[side] };
      setPrefs(next);
      setVisualizerPanels(next);
    },
    [prefs],
  );
  return { ...prefs, toggle };
}
