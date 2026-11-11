import type {
  DnsBoxRow,
  DnsCacheCard,
  DnsCachingModel,
  DnsCardKey,
  DnsTrafficTimeline,
} from "@/lib/visualizer/core/shapes";

const SEG_LABEL: Record<DnsCardKey, string> = {
  old: "10.0.1.5",
  new: "10.0.2.9",
  nx: "NXDOMAIN",
  ok: "10.0.1.5",
};

function fmt(v: number): string {
  return v >= 1000 ? v.toLocaleString("en-US") : String(Math.round(v * 10) / 10);
}

function cardClass(k: DnsCardKey): string {
  return `viz-dns__card viz-dns__card--${k}`;
}

function DnsRecordCard({ card, w }: { card: DnsCacheCard; w: number }) {
  const fr = card.max ? Math.max(0, Math.min(1, (card.left ?? 0) / card.max)) : 0;
  return (
    <>
      <rect x={8} y={0} width={w} height={56} rx={6} className={cardClass(card.k)} />
      <text x={16} y={16} className="viz-dns__svg-meta">
        {card.l1}
      </text>
      <text x={16} y={32} className="viz-dns__svg-val">
        {card.l2}
      </text>
      {card.max != null ? (
        <>
          <rect x={16} y={40} width={w - 16} height={8} rx={3} className="viz-dns__ttl-bg" />
          <rect
            x={16}
            y={40}
            width={(w - 16) * fr}
            height={8}
            rx={3}
            className={`viz-dns__ttl-fill viz-dns__ttl-fill--${card.k}`}
          />
          <text
            x={w}
            y={32}
            textAnchor="end"
            className={(card.left ?? 0) <= 0 ? "viz-dns__svg-alert" : "viz-dns__svg-val"}
          >
            {(card.left ?? 0) <= 0 ? "expired" : `${fmt(card.left ?? 0)} ${card.unit ?? "s"} left`}
          </text>
        </>
      ) : card.tag ? (
        <text x={w} y={32} textAnchor="end" className="viz-dns__svg-val">
          {card.tag}
        </text>
      ) : null}
    </>
  );
}

function DnsArrow({
  x1,
  x2,
  y,
  label,
  colorKey,
  ly,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  colorKey: string;
  ly: number;
}) {
  const right = x2 > x1;
  return (
    <g>
      <line
        x1={x1 + (right ? 8 : -8)}
        x2={x2 + (right ? -8 : 8)}
        y1={y}
        y2={y}
        className={`viz-dns__arrow viz-dns__arrow--${colorKey}`}
        markerEnd={`url(#viz-dns-arr-${colorKey})`}
      />
      <text
        x={(x1 + x2) / 2}
        y={ly}
        textAnchor="middle"
        className={`viz-dns__arrow-label viz-dns__arrow-label--${colorKey}`}
      >
        {label}
      </text>
    </g>
  );
}

function DnsTimeline({ tl }: { tl: DnsTrafficTimeline }) {
  const X0 = 200;
  const X1 = 880;
  const rows = tl.rows.length;
  const TY = 58 + 118 + 70;
  const ax = tl.axis;
  const xs = (t: number) => X0 + ((t - ax[0]) / (ax[1] - ax[0])) * (X1 - X0);
  return (
    <g>
      <text x={10} y={TY} className="viz-dns__svg-title">
        {tl.title ?? "Traffic goes to"}
      </text>
      {tl.ticks.map(([t, l]) => (
        <g key={`${t}-${l}`}>
          <line
            x1={xs(t)}
            x2={xs(t)}
            y1={TY + 8}
            y2={TY + 12 + rows * 30}
            className="viz-dns__tl-grid"
          />
          <text x={xs(t)} y={TY + 28 + rows * 30} textAnchor="middle" className="viz-dns__svg-meta">
            {l}
          </text>
        </g>
      ))}
      {tl.rows.map((r, i) => {
        const y = TY + 12 + i * 30;
        return (
          <g key={r.label}>
            <text x={10} y={y + 16} className="viz-dns__svg-lane">
              {r.label}
            </text>
            <rect
              x={X0}
              y={y + 2}
              width={X1 - X0}
              height={20}
              rx={3}
              className="viz-dns__tl-track"
            />
            {r.segs.map(([a, b, k, lab], si) => {
              const bb = Math.min(b, tl.now);
              if (bb <= a) return null;
              const w = xs(bb) - xs(a);
              const txt = lab ?? SEG_LABEL[k];
              return (
                <g key={si}>
                  <rect
                    x={xs(a)}
                    y={y + 2}
                    width={Math.max(1.5, w)}
                    height={20}
                    className={`viz-dns__tl-seg viz-dns__tl-seg--${k}`}
                  />
                  {w > txt.length * 6.6 + 8 ? (
                    <text x={xs(a) + 5} y={y + 16} className="viz-dns__tl-seg-label">
                      {txt}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
      {(tl.marks ?? []).map(([t, l, c]) => {
        if (t > tl.now) return null;
        const x = xs(t);
        return (
          <g key={`${t}-${l}`}>
            <line
              x1={x}
              x2={x}
              y1={TY + 6}
              y2={TY + 12 + rows * 30}
              className={
                c === "io"
                  ? "viz-dns__mark--io"
                  : c === "muted"
                    ? "viz-dns__mark--muted"
                    : "viz-dns__mark"
              }
            />
            <text x={x + 4} y={TY + 4} className="viz-dns__mark-label">
              {l}
            </text>
          </g>
        );
      })}
      {tl.now < ax[1] ? (
        <line
          x1={xs(tl.now)}
          x2={xs(tl.now)}
          y1={TY + 8}
          y2={TY + 12 + rows * 30}
          className="viz-dns__now"
        />
      ) : null}
    </g>
  );
}

export function DnsChainDiagram({ model }: { model: DnsCachingModel }) {
  const boxes = model.boxes;
  const n = boxes.length;
  const BW = n === 4 ? 190 : 240;
  const gap = (860 - n * BW) / (n - 1);
  const bx = (i: number) => 20 + i * (BW + gap);
  const BY = 58;
  const BH = 118;
  const extraH = model.extra ? 96 : 0;
  const rows = model.timeline.rows.length;
  const TY = BY + BH + 70 + extraH;
  const H = TY + 30 + rows * 30 + 28;

  return (
    <svg
      viewBox={`0 0 900 ${H}`}
      role="img"
      aria-label="DNS cache chain and where traffic goes"
      className="viz-dns__svg"
    >
      <defs>
        {(["old", "new", "nx", "ok", "muted"] as const).map((k) => (
          <marker
            key={k}
            id={`viz-dns-arr-${k}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`viz-dns__marker viz-dns__marker--${k}`} />
          </marker>
        ))}
      </defs>
      {boxes.map((b: DnsBoxRow, i) => (
        <g key={`${b.n}-${i}`}>
          <rect
            x={bx(i)}
            y={BY}
            width={BW}
            height={BH}
            rx={10}
            className={b.hl ? "viz-dns__box viz-dns__box--hl" : "viz-dns__box"}
          />
          <text x={bx(i) + 10} y={BY + 18} className="viz-dns__box-title">
            {b.n}
          </text>
          <text x={bx(i) + 10} y={BY + 33} className="viz-dns__svg-meta">
            {b.sub ?? ""}
          </text>
          {b.card ? (
            <g transform={`translate(${bx(i) + 10},${BY + 44})`}>
              <DnsRecordCard card={b.card} w={BW - 20} />
            </g>
          ) : b.note ? (
            <text x={bx(i) + 10} y={BY + 72} className="viz-dns__svg-meta">
              {b.note}
            </text>
          ) : null}
          {b.note2 ? (
            <text
              x={bx(i) + 10}
              y={BY + BH - 8}
              className={
                b.note2c === "io"
                  ? "viz-dns__svg-io"
                  : b.note2c === "alert"
                    ? "viz-dns__svg-alert"
                    : "viz-dns__svg-meta"
              }
            >
              {b.note2}
            </text>
          ) : null}
        </g>
      ))}
      {(model.req ?? []).map(([i, j, l, c], k) => (
        <DnsArrow
          key={`req-${k}`}
          x1={bx(i) + BW * 0.5}
          x2={bx(j) + BW * 0.5}
          y={BY - 14}
          label={l}
          colorKey={c ?? "ok"}
          ly={BY - 20}
        />
      ))}
      {(model.answerArrows ?? []).map(([i, j, l, c], k) => (
        <DnsArrow
          key={`answer-${k}`}
          x1={bx(i) + BW * 0.5}
          x2={bx(j) + BW * 0.5}
          y={BY + BH + 16}
          label={l}
          colorKey={c ?? "ok"}
          ly={BY + BH + 32}
        />
      ))}
      {model.extra ? (
        <g>
          <line
            x1={bx(model.extra.under) + BW / 2}
            x2={bx(model.extra.under) + BW / 2}
            y1={BY + BH + 20}
            y2={BY + BH + 44}
            className="viz-dns__extra-line"
            markerEnd="url(#viz-dns-arr-ok)"
          />
          <g transform={`translate(${bx(model.extra.under) + (BW - 210) / 2},${BY + BH + 46})`}>
            <rect width={210} height={80} rx={9} className="viz-dns__extra-panel" />
            <text x={10} y={16} className="viz-dns__box-title">
              {model.extra.n}
            </text>
            <g transform="translate(10, 22)">
              <DnsRecordCard card={model.extra.card} w={190} />
            </g>
          </g>
        </g>
      ) : null}
      <DnsTimeline tl={model.timeline} />
    </svg>
  );
}
