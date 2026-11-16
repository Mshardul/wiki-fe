import { useId } from "react";
import {
  FLOW_ARROW_W,
  FLOW_CARD_H,
  FLOW_CARD_PAD,
  FLOW_CHIP_H,
  FLOW_CHIP_W,
  FLOW_HUB_H,
  FLOW_HUB_W,
  FLOW_INTAKE_H,
  FLOW_INTAKE_W,
  FLOW_NAME_W,
  FLOW_PANEL_H,
  flowCardsLayout,
  wrapNote,
} from "@/lib/visualizer/core/flow-cards-layout";
import type { FlowCardsModel, FlowChip, FlowPanelBody } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

const BAR_PAD = 7;
const BAR_W = FLOW_CHIP_W - 2 * BAR_PAD;
const PANEL_TOP = 18;
const PANEL_ROW_H = 26;
const PANEL_BAR_W = 90;

const byId = (a: { id: string }, b: { id: string }): number =>
  a.id.localeCompare(b.id, undefined, { numeric: true });

function Chip({ chip, x, y }: { chip: FlowChip; x: number; y: number }) {
  const cls = [
    "viz-flow__chip",
    chip.heavy && "viz-flow__chip--heavy",
    chip.ghost && "viz-flow__chip--ghost",
  ]
    .filter(Boolean)
    .join(" ");
  const share = chip.total > 0 ? Math.max(0, Math.min(1, chip.left / chip.total)) : 0;
  return (
    <g className={cls} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <rect className="viz-flow__chip-box" width={FLOW_CHIP_W} height={FLOW_CHIP_H} rx={6} />
      <text className="viz-flow__chip-id" x={BAR_PAD} y={16}>
        {chip.label}
      </text>
      <text className="viz-flow__chip-left" x={FLOW_CHIP_W - BAR_PAD} y={16} textAnchor="end">
        {chip.ghost ? chip.left : `${chip.left} / ${chip.total}`}
      </text>
      <rect className="viz-flow__track" x={BAR_PAD} y={25} width={BAR_W} height={6} rx={3} />
      <rect
        className="viz-flow__fill"
        x={BAR_PAD}
        y={25}
        height={6}
        rx={3}
        style={{ width: BAR_W * share }}
      />
    </g>
  );
}

function PanelBody({ body, x, y }: { body: FlowPanelBody; x: number; y: number }) {
  if (body.kind === "tokens") {
    return (
      <g>
        {body.items.map((t, i) => (
          <g
            key={t.label}
            className={`viz-flow__token${t.on ? " viz-flow__token--on" : ""}${t.muted ? " viz-flow__token--muted" : ""}`}
            transform={`translate(${x + i * 50 + 20} ${y + 22})`}
          >
            <circle r={19} />
            <text textAnchor="middle" dy="0.35em">
              {t.label}
            </text>
          </g>
        ))}
        {body.items.some((t) => t.on) && (
          <text
            className="viz-flow__token-note"
            x={x + 20 + 50 * body.items.findIndex((t) => t.on)}
            y={y + 58}
            textAnchor="middle"
          >
            turn
          </text>
        )}
      </g>
    );
  }
  if (body.kind === "bars") {
    return (
      <g>
        {body.rows.map((r, i) => (
          <g
            key={r.label}
            className={`viz-flow__row${r.mark ? " viz-flow__row--mark" : ""}${r.muted ? " viz-flow__row--muted" : ""}`}
            transform={`translate(${x} ${y + i * PANEL_ROW_H})`}
          >
            <text className="viz-flow__row-name" y={13}>
              {r.label}
            </text>
            <rect
              className="viz-flow__row-bar"
              x={26}
              y={3}
              height={12}
              rx={3}
              style={{ width: Math.max(3, r.of > 0 ? (PANEL_BAR_W * r.value) / r.of : 0) }}
            />
            <text className="viz-flow__row-note" x={26 + PANEL_BAR_W + 8} y={13}>
              {r.note}
            </text>
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {body.lines.map((l, i) => (
        <text key={l} className="viz-flow__math" x={x} y={y + 14 + i * 22}>
          {l}
        </text>
      ))}
    </g>
  );
}

export function FlowCardsShape({ model, subject }: { model: FlowCardsModel; subject: string }) {
  const layout = flowCardsLayout(model);
  const uid = useId().replace(/:/g, "");
  const hatch = `viz-flow-hatch-${uid}`;
  const arrow = `viz-flow-arrow-${uid}`;
  const arrowOn = `viz-flow-arrow-on-${uid}`;
  const cardIndex = new Map(model.cards.map((c, i) => [c.id, i]));
  const centerY = (id: string): number =>
    (layout.cardY[cardIndex.get(id) ?? 0] as number) + FLOW_CARD_H / 2;
  // Chips draw in one fixed order so a move is a position change, never a remount.
  const chips = model.cards
    .flatMap((c) => c.chips.map((chip) => ({ chip, down: c.down })))
    .sort((a, b) => byId(a.chip, b.chip));
  const hubRight = layout.hub.x + FLOW_HUB_W;
  const hubMid = layout.hub.y + FLOW_HUB_H / 2;
  const { panel } = model;
  const note = wrapNote(panel.headline.note);
  const bodyY = layout.panelY + PANEL_TOP + 8;
  const headY = layout.panelY + FLOW_PANEL_H - 70;
  const label = model.cards
    .map((c) => `${c.label}: ${c.down ? "down" : `${c.count} ${c.countLabel}`}`)
    .join("; ");
  return (
    <div className="viz-flow" role="img" aria-label={`${subject}: ${label}`}>
      <FitBox className="viz-flow__fit">
        <svg
          className="viz-flow__svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={hatch}
              width={8}
              height={8}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line className="viz-flow__hatch" x1={0} y1={0} x2={0} y2={8} />
            </pattern>
            <marker
              id={arrow}
              markerUnits="userSpaceOnUse"
              markerWidth={10}
              markerHeight={10}
              refX={9}
              refY={5}
              orient="auto"
            >
              <path className="viz-flow__head" d="M0 0L10 5L0 10z" />
            </marker>
            <marker
              id={arrowOn}
              markerUnits="userSpaceOnUse"
              markerWidth={10}
              markerHeight={10}
              refX={9}
              refY={5}
              orient="auto"
            >
              <path className="viz-flow__head viz-flow__head--on" d="M0 0L10 5L0 10z" />
            </marker>
          </defs>

          {model.intake && (
            <g transform={`translate(${layout.intake.x} ${layout.intake.y})`}>
              <text className="viz-flow__lab" x={FLOW_INTAKE_W / 2} y={-8} textAnchor="middle">
                {model.intake.caption}
              </text>
              <rect
                className="viz-flow__intake"
                width={FLOW_INTAKE_W}
                height={FLOW_INTAKE_H}
                rx={6}
              />
              <text className="viz-flow__intake-id" x={BAR_PAD + 2} y={25}>
                {model.intake.label}
              </text>
              <text
                className="viz-flow__intake-note"
                x={FLOW_INTAKE_W - BAR_PAD - 2}
                y={25}
                textAnchor="end"
              >
                {model.intake.note}
              </text>
            </g>
          )}
          {model.intake && (
            <line
              className="viz-flow__line"
              x1={layout.intake.x + FLOW_INTAKE_W}
              y1={hubMid}
              x2={layout.hub.x}
              y2={hubMid}
            />
          )}

          <g className="viz-flow__hub" transform={`translate(${layout.hub.x} ${layout.hub.y})`}>
            <rect width={FLOW_HUB_W} height={FLOW_HUB_H} rx={10} />
            <text x={FLOW_HUB_W / 2} y={FLOW_HUB_H / 2} textAnchor="middle">
              {model.hub.split(" ").map((word, i, all) => (
                <tspan
                  key={word}
                  x={FLOW_HUB_W / 2}
                  dy={i === 0 ? `${0.35 - 0.6 * (all.length - 1)}em` : "1.2em"}
                >
                  {word}
                </tspan>
              ))}
            </text>
          </g>

          {model.cards.map((c, i) => {
            const on = model.routeTo === c.id;
            return (
              <line
                key={c.id}
                className={`viz-flow__route${on ? " viz-flow__route--on" : ""}${c.down ? " viz-flow__route--down" : ""}`}
                x1={hubRight}
                y1={hubMid}
                x2={layout.cardX - 3}
                y2={centerY(c.id)}
                markerEnd={`url(#${on ? arrowOn : arrow})`}
                data-index={i}
              />
            );
          })}

          {model.moves.map((m) => {
            const x = layout.cardX;
            const y1 = centerY(m.from);
            const y2 = centerY(m.to);
            const bulge = x - FLOW_ARROW_W / 2;
            return (
              <path
                key={`${m.from}-${m.to}`}
                className="viz-flow__move"
                d={`M ${x} ${y1} C ${bulge} ${y1}, ${bulge} ${y2}, ${x - 3} ${y2}`}
                markerEnd={`url(#${arrowOn})`}
              />
            );
          })}

          {model.cards.map((c, i) => (
            <g
              key={c.id}
              className={`viz-flow__card viz-hue-${c.hue}${model.routeTo === c.id ? " viz-flow__card--picked" : ""}${c.down ? " viz-flow__card--down" : ""}`}
              transform={`translate(${layout.cardX} ${layout.cardY[i]})`}
            >
              <rect
                className="viz-flow__card-box"
                width={layout.cardW}
                height={FLOW_CARD_H}
                rx={8}
              />
              {c.down && (
                <rect
                  className="viz-flow__card-hatch"
                  width={layout.cardW}
                  height={FLOW_CARD_H}
                  rx={8}
                  fill={`url(#${hatch})`}
                />
              )}
              <text className="viz-flow__name" x={FLOW_CARD_PAD} y={17}>
                {c.label}
              </text>
              {c.badge && (
                <text className="viz-flow__badge" x={FLOW_NAME_W - 4} y={17} textAnchor="end">
                  {c.badge}
                </text>
              )}
              <text className="viz-flow__count" x={FLOW_NAME_W / 2} y={42} textAnchor="middle">
                {c.count}
              </text>
              <text
                className="viz-flow__count-label"
                x={FLOW_NAME_W / 2}
                y={55}
                textAnchor="middle"
              >
                {c.countLabel}
              </text>
              {c.chips.length === 0 && !c.down && (
                <text
                  className="viz-flow__idle"
                  x={FLOW_NAME_W + FLOW_CARD_PAD + FLOW_CHIP_W / 2}
                  y={FLOW_CARD_H / 2}
                  textAnchor="middle"
                  dy="0.35em"
                >
                  idle
                </text>
              )}
            </g>
          ))}

          {chips.map(({ chip, down }) => {
            const at = layout.chips.get(chip.id);
            if (!at) return null;
            return (
              <g key={chip.id} className={down ? "viz-flow__on-down" : undefined}>
                <Chip chip={chip} x={at.x} y={at.y} />
              </g>
            );
          })}

          <g className="viz-flow__panel">
            <line
              className="viz-flow__divider"
              x1={layout.panelX - 16}
              y1={layout.panelY}
              x2={layout.panelX - 16}
              y2={layout.panelY + FLOW_PANEL_H}
            />
            <text className="viz-flow__lab" x={layout.panelX} y={layout.panelY + 10}>
              {panel.title}
            </text>
            <PanelBody body={panel.body} x={layout.panelX} y={bodyY} />
            <text className="viz-flow__lab" x={layout.panelX} y={headY}>
              {panel.headline.label}
            </text>
            <text className="viz-flow__headline" x={layout.panelX} y={headY + 20}>
              {panel.headline.value}
            </text>
            {note.map((l, i) => (
              <text
                key={l}
                className="viz-flow__headline-note"
                x={layout.panelX}
                y={headY + 38 + i * 14}
              >
                {l}
              </text>
            ))}
          </g>
        </svg>
      </FitBox>
    </div>
  );
}
