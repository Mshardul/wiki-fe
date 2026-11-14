import type { CSSProperties } from "react";
import { type ArrayModel, type ArrayRow, modelKeys } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

const TAG_HUES = 4;

function tagHue(tag: string): number {
  return (tag.charCodeAt(0) || 0) % TAG_HUES;
}

function pointersByIndex(row: ArrayRow): Map<number, ArrayRow["pointers"]> {
  const out = new Map<number, ArrayRow["pointers"]>();
  for (const p of row.pointers) out.set(p.index, [...(out.get(p.index) ?? []), p]);
  return out;
}

function ArrayRowView({ row, scale }: { row: ArrayRow; scale: number }) {
  const n = row.bars.length;
  const pointers = pointersByIndex(row);
  const style = {
    gridTemplateColumns: `repeat(${n}, var(--viz-array-pitch))`,
    "--viz-array-scale": Math.max(1, scale),
  } as CSSProperties;
  return (
    <div className="viz-array__row">
      {row.label && <span className="viz-array__label">{row.label}</span>}
      <div className="viz-array__grid" style={style}>
        {row.bars.map((bar, i) => {
          const col = { gridColumn: i + 1, gridRow: 1 };
          // Slot position is the identity of a bar; values move between slots.
          if (!bar) {
            return (
              <div key={i} className="viz-array__slot" style={col}>
                <span
                  className={`viz-array__empty${row.next === i ? " viz-array__empty--next" : ""}`}
                />
              </div>
            );
          }
          const faded = bar.faded ? " viz-array__slot--faded" : "";
          return (
            <div key={i} className={`viz-array__slot${faded}`} style={col}>
              <span className="viz-array__value">
                {bar.value}
                {bar.tag && <span className="viz-array__tagtext">{bar.tag}</span>}
              </span>
              <span
                className={`viz-array__bar viz-array__bar--${bar.tone}${
                  bar.tag ? ` viz-array__bar--tag-${tagHue(bar.tag)}` : ""
                }`}
                style={{ "--viz-array-value": bar.value } as CSSProperties}
              />
            </div>
          );
        })}
        {row.indices.map((label, i) => (
          <span
            // Index labels are positional.
            key={i}
            className="viz-array__index"
            style={{ gridColumn: i + 1, gridRow: 2 }}
          >
            {label}
          </span>
        ))}
        {row.zones.map((z) => (
          <span
            key={`${z.from}-${z.to}-${z.label}`}
            className={`viz-array__zone viz-array__zone--${z.tone}`}
            style={{ gridColumn: `${z.from + 1} / ${z.to + 2}`, gridRow: 3 }}
          >
            {z.label}
          </span>
        ))}
        {[...pointers].map(([index, list]) => (
          <span
            key={index}
            className="viz-array__pointers"
            style={{ gridColumn: index + 1, gridRow: 4 }}
          >
            {list.map((p) => (
              <span
                key={p.label}
                className={`viz-array__pointer${p.tone ? ` viz-array__pointer--${p.tone}` : ""}`}
              >
                {p.label}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

// The rows alone unscaled; the heap shape draws these under its tree.
export function ArrayRows({ model }: { model: ArrayModel }) {
  return (
    <div className="viz-array__rows">
      {model.rows.map((row, i) => (
        // Rows are positional: row 0 is always the main row.
        <ArrayRowView key={i} row={row} scale={model.scale} />
      ))}
    </div>
  );
}

export function ArrayShape({ model, subject }: { model: ArrayModel; subject: string }) {
  return (
    <div className="viz-array" role="img" aria-label={`${subject}: ${modelKeys(model).join(", ")}`}>
      <FitBox className="viz-array__fit">
        <ArrayRows model={model} />
      </FitBox>
    </div>
  );
}
