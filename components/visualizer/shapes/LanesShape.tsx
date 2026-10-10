import type { ReactNode } from "react";
import { CARD_ROW_H, CHIPS_PER_ROW, lanesLayout } from "@/lib/visualizer/core/geometry";
import type { CardItem, CardSection, LanesModel } from "@/lib/visualizer/core/shapes";

const HEAD_W = 92;
const HEAD_H = 30;
const HEAD_Y = 10;
const CHIP_W = 50;
const CHIP_H = 14;
const CHIP_GAP = 4;
const BAR_W = 44;
const PAD_X = 10;

const itemClass = (base: string, item: CardItem): string =>
  `${base} ${base}--${item.tone ?? "plain"}`;

function cardNodes(sections: CardSection[], cx: number, top: number, w: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const left = cx - w / 2 + PAD_X;
  const baseline = (row: number): number => top + 8 + (row + 1) * CARD_ROW_H - 3;
  let row = 0;
  for (const s of sections) {
    nodes.push(
      <text key={`${s.title}-title`} className="viz-lanes__title" x={left} y={baseline(row)}>
        {s.title}
      </text>,
    );
    row += 1;
    if (s.layout === "rows") {
      s.items.forEach((item, i) => {
        const y = baseline(row + i);
        nodes.push(
          <text
            key={`${s.title}-${i}`}
            className={itemClass("viz-lanes__item", item)}
            x={left}
            y={y}
          >
            {item.text}
          </text>,
        );
        if (item.bar && item.bar.max > 0) {
          const bx = cx + w / 2 - PAD_X - BAR_W;
          nodes.push(
            <g key={`${s.title}-${i}-bar`} className="viz-lanes__bar">
              <rect
                className="viz-lanes__bar-track"
                x={bx}
                y={y - 7}
                width={BAR_W}
                height={5}
                rx={2}
              />
              <rect
                className="viz-lanes__bar-fill"
                x={bx}
                y={y - 7}
                width={(BAR_W * item.bar.value) / item.bar.max}
                height={5}
                rx={2}
              />
            </g>,
          );
        }
      });
      row += s.items.length;
    } else {
      s.items.forEach((item, i) => {
        const x = left + (i % CHIPS_PER_ROW) * (CHIP_W + CHIP_GAP);
        const y = baseline(row + Math.floor(i / CHIPS_PER_ROW)) - 11;
        nodes.push(
          <g key={`${s.title}-${i}`}>
            <rect
              className={itemClass("viz-lanes__chip", item)}
              x={x}
              y={y}
              width={CHIP_W}
              height={CHIP_H}
              rx={4}
            />
            <text
              className={itemClass("viz-lanes__chip-text", item)}
              x={x + CHIP_W / 2}
              y={y + 10.5}
              textAnchor="middle"
            >
              {item.text}
            </text>
          </g>,
        );
      });
      row += Math.ceil(s.items.length / CHIPS_PER_ROW);
    }
  }
  return nodes;
}

export function LanesShape({ model, subject }: { model: LanesModel; subject: string }) {
  const layout = lanesLayout(model.lanes.length, model.slots, model.cardRows);
  const xOf = new Map(model.lanes.map((l, i) => [l.id, layout.laneX(i)]));
  const nameOf = new Map(model.lanes.map((l) => [l.id, l.name]));
  const spoken = model.hops.map(
    (h) => `${nameOf.get(h.from) ?? h.from} to ${nameOf.get(h.to) ?? h.to} ${h.label}`,
  );
  return (
    <svg
      className="viz-lanes"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`${subject}: ${spoken.join(", ") || "no messages"}`}
    >
      {model.lanes.map((lane, i) => {
        const x = layout.laneX(i);
        const dead = lane.dead ? " is-dead" : "";
        return (
          <g key={lane.id}>
            <g className={`viz-lanes__head${dead}`}>
              <rect x={x - HEAD_W / 2} y={HEAD_Y} width={HEAD_W} height={HEAD_H} rx={9} />
              <text x={x} y={HEAD_Y + 20}>
                {lane.dead ? `${lane.name} ✕` : lane.name}
              </text>
            </g>
            {lane.sections.length > 0 && layout.cardH > 0 && (
              <g className={`viz-lanes__card${dead}`}>
                <rect
                  x={x - layout.cardW / 2}
                  y={layout.cardY}
                  width={layout.cardW}
                  height={layout.cardH}
                  rx={8}
                />
                {cardNodes(lane.sections, x, layout.cardY, layout.cardW)}
              </g>
            )}
            <line
              className={`viz-lanes__life${dead}`}
              x1={x}
              y1={layout.lifeTop}
              x2={x}
              y2={layout.lifeBottom}
            />
          </g>
        );
      })}
      {model.hops.map((h, i) => {
        const x1 = xOf.get(h.from) ?? 0;
        const x2 = xOf.get(h.to) ?? 0;
        const dir = x2 >= x1 ? 1 : -1;
        const y = layout.hopY(i);
        const base = x2 - dir * 10;
        const cls = [
          "viz-lanes__hop",
          `viz-lanes__hop--t${h.thread}`,
          h.reply && "is-reply",
          h.flag && "is-flag",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g
            key={`${model.epoch ?? 0}-${i}-${h.from}-${h.to}-${h.label}`}
            className={cls}
            style={{ animationDelay: `${i * 0.45}s` }}
          >
            <line x1={x1 + dir * 2} y1={y} x2={base} y2={y} />
            <path
              className="viz-lanes__tip"
              d={`M${x2 - dir * 4},${y} L${base},${y - 5} L${base},${y + 5} Z`}
            />
            <text className="viz-lanes__label" x={(x1 + x2) / 2} y={y - 7} textAnchor="middle">
              {h.label}
            </text>
            <circle className="viz-lanes__badge" cx={x1 + dir * 14} cy={y} r={8.5} />
            <text
              className="viz-lanes__num"
              x={x1 + dir * 14}
              y={y + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
      {model.note && (
        <text
          className="viz-lanes__note"
          x={layout.width / 2}
          y={layout.lifeBottom - 12}
          textAnchor="middle"
        >
          {model.note}
        </text>
      )}
    </svg>
  );
}
