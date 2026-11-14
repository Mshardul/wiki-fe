import { modelKeys, type TableList, type TableModel } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

// Mirror the --viz-table-* sizes in css/tokens.css (a test keeps them equal).
export const TABLE_SLOT_W = 72;
export const TABLE_SLOT_H = 30;
export const TABLE_INDEX_W = 28;
export const TABLE_NODE_W = 44;
export const TABLE_LANE_W = 40;
export const TABLE_CHIP_W = 104;
export const TABLE_LIST_GAP = 24;
export const TABLE_METER_H = 14;

const PAD = 24;
const TITLE_H = 20;
const INSET = 3;
const METER_LABEL_W = 44;
const METER_ROOM = 34;

const listWidth = (l: TableList): number =>
  TABLE_CHIP_W + TABLE_INDEX_W + TABLE_SLOT_W + l.room * TABLE_NODE_W + (l.lane ? TABLE_LANE_W : 0);

function ListView({
  list,
  x0,
  top,
  rows,
}: {
  list: TableList;
  x0: number;
  top: number;
  rows: number;
}) {
  const slotX = TABLE_CHIP_W + TABLE_INDEX_W;
  const laneX = slotX + TABLE_SLOT_W + list.room * TABLE_NODE_W;
  const cy = (i: number) => top + i * TABLE_SLOT_H + TABLE_SLOT_H / 2;
  const h = TABLE_SLOT_H - 6;
  const chip = list.chip;
  const chipH = chip ? 24 + chip.lines.length * 14 : 0;
  const chipY = top + (rows * TABLE_SLOT_H) / 2 - chipH / 2;
  return (
    <g
      className={`viz-table__list${list.faded ? " viz-table__list--faded" : ""}`}
      transform={`translate(${x0} 0)`}
    >
      {list.title && (
        <text className="viz-table__title" x={slotX} y={TITLE_H - 8}>
          {list.title}
        </text>
      )}
      {list.runs.map((r) => (
        <rect
          key={`run-${r.from}-${r.to}`}
          className="viz-table__run"
          x={slotX - INSET}
          y={top + r.from * TABLE_SLOT_H + 1}
          width={TABLE_SLOT_W + 2 * INSET}
          height={(r.to - r.from + 1) * TABLE_SLOT_H - 4}
          rx={6}
        />
      ))}
      {list.slots.map((s, i) => (
        // Slot position is the identity; contents change between frames.
        <g
          key={i}
          className={`viz-table__slot viz-table__slot--${s.state} viz-table__slot--${s.tone}`}
        >
          <text className="viz-table__index" x={slotX - 6} y={cy(i)} textAnchor="end" dy="0.35em">
            {s.index}
          </text>
          <rect
            className="viz-table__cell"
            x={slotX}
            y={cy(i) - h / 2}
            width={TABLE_SLOT_W}
            height={h}
            rx={5}
          />
          {s.state === "marked" && (
            <text
              className="viz-table__cross"
              x={slotX + TABLE_SLOT_W / 2}
              y={cy(i)}
              textAnchor="middle"
              dy="0.35em"
            >
              ×
            </text>
          )}
          {s.state === "filled" && s.label !== undefined && (
            <text
              className="viz-table__label"
              x={slotX + (s.note ? 10 : TABLE_SLOT_W / 2)}
              y={cy(i)}
              textAnchor={s.note ? "start" : "middle"}
              dy="0.35em"
            >
              {s.label}
            </text>
          )}
          {s.note && (
            <text
              className="viz-table__note"
              x={slotX + TABLE_SLOT_W - 8}
              y={cy(i)}
              textAnchor="end"
              dy="0.35em"
            >
              {s.note}
            </text>
          )}
          {s.nodes.map((n, k) => {
            const nx = slotX + TABLE_SLOT_W + k * TABLE_NODE_W;
            return (
              <g
                // Items are positional along the slot.
                key={k}
                className={`viz-table__node viz-table__node--${n.tone}${n.outlined ? " viz-table__node--outlined" : ""}`}
              >
                <line className="viz-table__link" x1={nx} y1={cy(i)} x2={nx + 10} y2={cy(i)} />
                <rect x={nx + 10} y={cy(i) - h / 2} width={TABLE_NODE_W - 12} height={h} rx={5} />
                <text
                  x={nx + 10 + (TABLE_NODE_W - 12) / 2}
                  y={cy(i)}
                  textAnchor="middle"
                  dy="0.35em"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      ))}
      {list.hops.map((p) => {
        const span = Math.abs(p.to - p.from);
        const bulge = Math.min(2 * TABLE_LANE_W - 8, 12 + 6 * span);
        const y1 = cy(p.from);
        const y2 = cy(p.to);
        return (
          <g
            key={`hop-${p.from}-${p.to}-${p.label}`}
            className={`viz-table__hop${p.current ? " viz-table__hop--current" : ""}`}
          >
            <path d={`M ${laneX} ${y1} Q ${laneX + bulge} ${(y1 + y2) / 2} ${laneX} ${y2}`} />
            <text x={laneX + bulge / 2 + 4} y={(y1 + y2) / 2} dy="0.35em">
              {p.label}
            </text>
          </g>
        );
      })}
      {chip && (
        <g className="viz-table__chip">
          {chip.to !== null && (
            <line
              className="viz-table__pointer"
              x1={TABLE_CHIP_W - 10}
              y1={chipY + chipH / 2}
              x2={slotX - 4}
              y2={cy(chip.to)}
            />
          )}
          <rect x={0} y={chipY} width={TABLE_CHIP_W - 10} height={chipH} rx={6} />
          <text
            className="viz-table__chip-key"
            x={(TABLE_CHIP_W - 10) / 2}
            y={chipY + 16}
            textAnchor="middle"
          >
            {chip.label}
          </text>
          {chip.lines.map((line, i) => (
            <text
              key={line}
              className="viz-table__chip-line"
              x={(TABLE_CHIP_W - 10) / 2}
              y={chipY + 30 + i * 14}
              textAnchor="middle"
            >
              {line}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

export function TableShape({ model, subject }: { model: TableModel; subject: string }) {
  const rows = Math.max(1, ...model.lists.map((l) => l.slots.length));
  const top = model.lists.some((l) => l.title) ? TITLE_H : 0;
  const widths = model.lists.map(listWidth);
  const listsW =
    widths.reduce((a, b) => a + b, 0) + TABLE_LIST_GAP * Math.max(0, widths.length - 1);
  const width = listsW + PAD;
  const meter = model.meter;
  const listsH = top + rows * TABLE_SLOT_H;
  const height = listsH + (meter ? METER_ROOM + TABLE_METER_H : 0);
  const starts = widths.map((_, i) =>
    widths.slice(0, i).reduce((sum, w) => sum + w + TABLE_LIST_GAP, 0),
  );
  const trackX = METER_LABEL_W;
  const trackW = width - METER_LABEL_W - PAD;
  return (
    <div className="viz-table" role="img" aria-label={`${subject}: ${modelKeys(model).join(", ")}`}>
      <FitBox className="viz-table__fit">
        <svg
          className="viz-table__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          {model.lists.map((list, i) => (
            // Lists are positional: list 0 is the older table during a resize.
            <ListView key={i} list={list} x0={starts[i] ?? 0} top={top} rows={rows} />
          ))}
          {meter && (
            <g className="viz-table__meter">
              <text className="viz-table__meter-label" x={0} y={listsH + METER_ROOM - 3}>
                {meter.label}
              </text>
              <rect
                className="viz-table__meter-track"
                x={trackX}
                y={listsH + METER_ROOM - TABLE_METER_H}
                width={trackW}
                height={TABLE_METER_H}
                rx={4}
              />
              <rect
                className="viz-table__meter-fill"
                x={trackX}
                y={listsH + METER_ROOM - TABLE_METER_H}
                width={trackW * Math.min(1, Math.max(0, meter.value / (meter.max || 1)))}
                height={TABLE_METER_H}
                rx={4}
              />
              {meter.mark !== null && (
                <g className="viz-table__meter-mark">
                  <line
                    x1={trackX + trackW * (meter.mark / (meter.max || 1))}
                    x2={trackX + trackW * (meter.mark / (meter.max || 1))}
                    y1={listsH + METER_ROOM - TABLE_METER_H - 4}
                    y2={listsH + METER_ROOM + 4}
                  />
                  {meter.markLabel && (
                    <text
                      x={trackX + trackW * (meter.mark / (meter.max || 1))}
                      y={listsH + METER_ROOM - TABLE_METER_H - 8}
                      textAnchor="middle"
                    >
                      {meter.markLabel}
                    </text>
                  )}
                </g>
              )}
            </g>
          )}
        </svg>
      </FitBox>
    </div>
  );
}
