import { Fragment } from "react";
import type { Rich } from "@/lib/visualizer/core/rich";

export function RichText({ value }: { value: Rich }) {
  return (
    <>
      {value.map((p, i) =>
        typeof p === "string" ? (
          // Parts are positional and never reorder, so the index is a stable key.
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <span key={i} className={`viz-rich viz-rich--${p.tone}`}>
            {p.text}
          </span>
        ),
      )}
    </>
  );
}
