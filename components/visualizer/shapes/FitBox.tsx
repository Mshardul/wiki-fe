import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { type Extent, fitScale } from "@/lib/visualizer/core/fit";
import { useElementSize } from "../hooks/useElementSize";

const UNMEASURED: Extent = { width: 0, height: 0 };

// Draws its children unscaled and scales them uniformly to fill the box it sits in.
export function FitBox({ children, className }: { children: ReactNode; className: string }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const view = useElementSize(viewRef);
  const [natural, setNatural] = useState<Extent>(UNMEASURED);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    // offsetWidth and offsetHeight ignore the transform, so they stay the unscaled size.
    const measure = () =>
      setNatural((n) =>
        n.width === el.offsetWidth && n.height === el.offsetHeight
          ? n
          : { width: el.offsetWidth, height: el.offsetHeight },
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = fitScale(natural, { width: view.w, height: view.h });
  return (
    <div className={`viz-fit ${className}`} ref={viewRef}>
      <div
        className="viz-fit__inner"
        ref={innerRef}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
