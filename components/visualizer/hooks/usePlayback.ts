import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/visualizer/core/motion";
import {
  clampFrame,
  elapsedForSub,
  isFrameDone,
  nextRepeat,
  type RepeatMode,
  type Speed,
  subStepAt,
  TICK_MS,
} from "@/lib/visualizer/core/playback";
import type { VizFrame } from "@/lib/visualizer/core/types";

export interface RestartOpts {
  /** When set, forces play/pause. Default: play unless reduced-motion. */
  play?: boolean;
}

export interface Playback {
  frame: number;
  sub: number;
  playing: boolean;
  speed: Speed;
  repeat: RepeatMode;
  seek: (i: number) => void;
  step: (delta: number) => void;
  pause: () => void;
  toggle: () => void;
  restart: (opts?: RestartOpts) => void;
  setSpeed: (speed: Speed) => void;
  cycleRepeat: () => void;
}

function pathLen(run: VizFrame[], i: number): number {
  return run[i]?.path.length ?? 1;
}

export function usePlayback(frames: VizFrame[], initialFrame = 0): Playback {
  const [rawFrame, setFrame] = useState(() => clampFrame(initialFrame, frames.length));
  const [sub, setSub] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeedState] = useState<Speed>(1);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const frame = clampFrame(rawFrame, frames.length);
  const startedAt = useRef(0);
  // Interval and callbacks read the latest values without re-subscribing every render.
  const live = useRef({ frame, sub, playing, speed, frames, repeat });
  // Extra passes already played since the last manual start; "once" allows one.
  const passes = useRef(0);
  useLayoutEffect(() => {
    live.current = { frame, sub, playing, speed, frames, repeat };
  });
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const seek = useCallback((i: number) => {
    const { frames: run, playing: isPlaying } = live.current;
    const f = clampFrame(i, run.length);
    passes.current = 0;
    setFrame(f);
    setSub(isPlaying ? 0 : Math.max(0, pathLen(run, f) - 1));
    startedAt.current = Date.now();
  }, []);

  const step = useCallback(
    (delta: number) => {
      live.current.playing = false;
      setPlaying(false);
      seek(live.current.frame + delta);
    },
    [seek],
  );

  const pause = useCallback(() => {
    live.current.playing = false;
    setPlaying(false);
  }, []);

  const restart = useCallback((opts?: RestartOpts) => {
    passes.current = 0;
    setFrame(0);
    setSub(0);
    setPlaying(opts?.play ?? !prefersReducedMotion());
    startedAt.current = Date.now();
  }, []);

  const toggle = useCallback(() => {
    const { frame: f, sub: s, playing: isPlaying, speed: sp, frames: run } = live.current;
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    const len = pathLen(run, f);
    if (f >= run.length - 1 && s >= len - 1) {
      // Explicit Play at the end — user asked to run, even with reduced motion.
      restart({ play: true });
      return;
    }
    startedAt.current = Date.now() - elapsedForSub(s, len, sp);
    setPlaying(true);
  }, [restart]);

  const setSpeed = useCallback((next: Speed) => {
    const elapsed = Date.now() - startedAt.current;
    startedAt.current = Date.now() - (elapsed * live.current.speed) / next;
    setSpeedState(next);
  }, []);

  const cycleRepeat = useCallback(() => setRepeat((m) => nextRepeat(m)), []);

  useEffect(() => {
    if (!playing) return;
    const jump = (next: number) => {
      live.current.frame = next;
      setFrame(next);
      setSub(0);
      startedAt.current = Date.now();
    };
    const id = window.setInterval(() => {
      // A stop is queued until the next render; later ticks in that window must not act.
      if (!live.current.playing) return;
      const { frame: f, speed: sp, frames: run, repeat: mode } = live.current;
      const elapsed = Date.now() - startedAt.current;
      setSub(subStepAt(elapsed, pathLen(run, f), sp));
      if (!isFrameDone(elapsed, sp)) return;

      if (f < run.length - 1) {
        jump(f + 1);
        return;
      }

      const loop = mode === "infinite" || (mode === "once" && passes.current === 0);
      if (loop) {
        passes.current += 1;
        jump(0);
        return;
      }
      passes.current = 0;
      live.current.playing = false;
      setPlaying(false);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  return {
    frame,
    sub,
    playing,
    speed,
    repeat,
    seek,
    step,
    pause,
    toggle,
    restart,
    setSpeed,
    cycleRepeat,
  };
}
