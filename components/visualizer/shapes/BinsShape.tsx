import { BIN_HEAD_H, BIN_W, binsLayout } from "@/lib/visualizer/core/bins-layout";
import { type BinItem, type BinsModel } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

const byId = (a: { id: string }, b: { id: string }): number =>
  a.id.localeCompare(b.id, undefined, { numeric: true });

export function BinsShape({ model, subject }: { model: BinsModel; subject: string }) {
  const layout = binsLayout(model);
  // Items render in a fixed order so a move is a position change, never a remount.
  const items = model.bins
    .flatMap((bin) => bin.items.map((item) => ({ item, hue: bin.hue })))
    .sort((a, b) => byId(a.item, b.item));
  const placed = new Map(layout.items.map((p) => [p.id, p]));
  const itemClass = (item: BinItem) =>
    [
      "viz-bins__item",
      item.changed && "viz-bins__item--changed",
      item.pending && "viz-bins__item--pending",
      model.active === item.id && "viz-bins__item--active",
    ]
      .filter(Boolean)
      .join(" ");
  const label = model.bins
    .map((b) => `${b.label}: ${b.items.map((i) => i.label).join(", ") || "empty"}`)
    .join("; ");
  return (
    <div className="viz-bins" role="img" aria-label={`${subject}: ${label}`}>
      <FitBox className="viz-bins__fit">
        <svg
          className="viz-bins__svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {model.bins.map((bin, i) => (
            <g
              key={bin.id}
              className={`viz-bins__bin viz-hue-${bin.hue}${bin.state ? ` viz-bins__bin--${bin.state}` : ""}`}
              transform={`translate(${layout.binX[i]} 0)`}
            >
              <rect
                className="viz-bins__well"
                x={0}
                y={BIN_HEAD_H - 4}
                width={BIN_W}
                height={layout.height - BIN_HEAD_H - 8}
                rx={6}
              />
              <text className="viz-bins__name" x={BIN_W / 2} y={18} textAnchor="middle">
                {bin.label}
              </text>
              <text className="viz-bins__count" x={BIN_W / 2} y={36} textAnchor="middle">
                {bin.count}
              </text>
            </g>
          ))}
          {items.map(({ item, hue }) => {
            const at = placed.get(item.id);
            if (!at) return null;
            return (
              <g
                key={item.id}
                className={`${itemClass(item)} viz-hue-${hue}`}
                style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
              >
                <rect width={at.w} height={at.h} rx={5} />
                <text x={at.w / 2} y={at.h / 2} textAnchor="middle" dy="0.35em">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </FitBox>
    </div>
  );
}
