import { useCallback, useEffect, useRef, useState } from "react";
import { type LoopPhase, type LoopState, loopState } from "@/lib/visualizer/core/loop";
import { prefersReducedMotion } from "@/lib/visualizer/core/motion";
import { TICK_MS } from "@/lib/visualizer/core/playback";

export interface LoopClock {
  lit: number;
  phase: LoopPhase;
  running: boolean;
  reduced: boolean;
  toggle: () => void;
}

export function useLoopClock(maxSteps: number): LoopClock {
  const reduced = prefersReducedMotion();
  const [running, setRunning] = useState(!reduced);
  const [state, setState] = useState<LoopState>(() => loopState(0, maxSteps));
  const elapsed = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!running || reduced) return;
    last.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last.current;
      last.current = now;
      const next = loopState(elapsed.current, maxSteps);
      setState((s) => (s.phase === next.phase && s.lit === next.lit ? s : next));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, reduced, maxSteps]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  if (reduced) return { lit: maxSteps, phase: "hold", running: false, reduced: true, toggle };
  return { lit: state.lit, phase: state.phase, running, reduced: false, toggle };
}
