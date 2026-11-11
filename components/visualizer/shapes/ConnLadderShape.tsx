import {
  CONN_PORTS_TOTAL,
  portRateSeries,
  portUsageAt,
} from "@/lib/visualizer/connection-cost/ports-sim";
import type { ConnLadderModel, ConnPacketKind } from "@/lib/visualizer/core/shapes";

const PACKET_CLASS: Record<ConnPacketKind, string> = {
  tcp: "conn-tcp",
  tls: "conn-tls",
  req: "conn-req",
  ticket: "conn-ticket",
  early: "conn-early",
  bad: "conn-bad",
};

function clockLabel(clock: string): string {
  return /^[\d+]/.test(clock) ? `t = ${clock}` : clock;
}

function LadderDiagram({ model }: { model: ConnLadderModel }) {
  const lanes = model.lanes ?? [
    { n: "Client", x: 250 },
    { n: "Server", x: 700 },
  ];
  const msgs = model.msgs ?? [];
  const now = model.now ?? 0;
  const tmax = model.tmax ?? Math.max(...msgs.map((m) => m.t1), 0) + 20;
  const k = Math.min(1.25, 560 / tmax);
  const top = 58;
  const ys = (t: number) => top + t * k;
  const H = top + tmax * k + 30;

  return (
    <svg
      viewBox={`0 0 900 ${H}`}
      role="img"
      aria-label="Packet ladder diagram"
      className="viz-conn__svg"
    >
      <defs>
        {(Object.keys(PACKET_CLASS) as ConnPacketKind[]).map((c) => (
          <marker
            key={c}
            id={`viz-conn-arr-${c}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`viz-conn__marker viz-conn__marker--${c}`} />
          </marker>
        ))}
      </defs>
      {lanes.map((l) => (
        <g key={l.n}>
          <rect
            x={l.x - 62}
            y={8}
            width={124}
            height={30}
            rx={7}
            className={
              l.bad ? "viz-conn__lane-head viz-conn__lane-head--bad" : "viz-conn__lane-head"
            }
          />
          <text x={l.x} y={28} textAnchor="middle" className="viz-conn__lane-title">
            {l.n}
          </text>
          <line
            x1={l.x}
            x2={l.x}
            y1={38}
            y2={H - 20}
            className="viz-conn__lane-line"
            strokeDasharray={l.dash ? "5 4" : undefined}
          />
        </g>
      ))}
      {Array.from({ length: Math.floor(tmax / 100) + 1 }, (_, i) => i * 100).map((t) => (
        <g key={t}>
          <text x={14} y={ys(t) + 4} className="viz-conn__tick">
            {t} ms
          </text>
          <line x1={56} x2={64} y1={ys(t)} y2={ys(t)} className="viz-conn__tick-line" />
        </g>
      ))}
      {(model.phases ?? []).map((p, i) => {
        if (p.t0 >= now) return null;
        const y0 = ys(p.t0);
        const y1 = ys(Math.min(p.t1, now));
        const kind = p.c;
        return (
          <g key={i}>
            <path
              d={`M${88},${y0 + 2} h-6 v${Math.max(0, y1 - y0 - 4)} h6`}
              fill="none"
              className={`viz-conn__phase viz-conn__phase--${kind in PACKET_CLASS ? kind : "req"}`}
            />
            {y1 - y0 > 22 ? (
              <text
                x={78}
                y={(y0 + y1) / 2}
                textAnchor="middle"
                className={`viz-conn__phase-label viz-conn__phase-label--${kind in PACKET_CLASS ? kind : "req"}`}
                transform={`rotate(-90 78 ${(y0 + y1) / 2})`}
              >
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {msgs.map((m, i) => {
        if (m.t0 >= now) return null;
        const A = lanes[m.a]!;
        const B = lanes[m.b]!;
        const frac = Math.min(1, (now - m.t0) / (m.t1 - m.t0));
        const x1 = A.x;
        const y1 = ys(m.t0);
        const x2 = A.x + (B.x - A.x) * frac;
        const y2 = ys(m.t0 + (m.t1 - m.t0) * frac);
        const kind = m.k;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={`viz-conn__pkt viz-conn__pkt--${kind}`}
              strokeWidth={m.w ?? 2}
              strokeDasharray={m.dash ? "6 4" : undefined}
              markerEnd={frac >= 1 ? `url(#viz-conn-arr-${kind})` : undefined}
            />
            {frac >= 1 && m.label ? (
              <g>
                <rect
                  x={x1 + (x2 - x1) * (m.lp ?? 0.5) - (m.label.length * 6.4 + 10) / 2}
                  y={y1 + (y2 - y1) * (m.lp ?? 0.5) - 11}
                  width={m.label.length * 6.4 + 10}
                  height={15}
                  rx={3}
                  className="viz-conn__pkt-label-bg"
                />
                <text
                  x={x1 + (x2 - x1) * (m.lp ?? 0.5)}
                  y={y1 + (y2 - y1) * (m.lp ?? 0.5)}
                  textAnchor="middle"
                  className={`viz-conn__pkt-label viz-conn__pkt-label--${kind}`}
                >
                  {m.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      {(model.marks ?? []).map((mk, i) => {
        if (mk.t > now) return null;
        const l = lanes[mk.lane]!;
        const y = ys(mk.t);
        return (
          <g key={i}>
            <circle
              cx={l.x}
              cy={y}
              r={4.5}
              className={`viz-conn__mark-dot viz-conn__mark-dot--${mk.col ?? "fg"}`}
            />
            <text
              x={l.x + (mk.left ? -10 : 10)}
              y={y + 4}
              textAnchor={mk.left ? "end" : "start"}
              className={`viz-conn__mark-label viz-conn__mark-label--${mk.col ?? "fg"}`}
            >
              {mk.label}
            </text>
          </g>
        );
      })}
      {now < tmax ? (
        <line x1={96} x2={886} y1={ys(now)} y2={ys(now)} className="viz-conn__now" />
      ) : null}
    </svg>
  );
}

function PortsDiagram({ model }: { model: ConnLadderModel }) {
  const t = model.t ?? 0;
  const { used, full } = portUsageAt(t, model.fix);
  const sx = 150;
  const sw = 720;
  const sxs = (sec: number) => sx + (sec / 70) * sw;
  const cols = 59;
  const rows = 24;
  const cw = 12.4;
  const ch = 8.6;
  const gx = 150;
  const gy = 54;
  const nCells = Math.ceil(CONN_PORTS_TOTAL / 20);
  const usedCells = Math.round(used / 20);
  const series = portRateSeries(t, model.fix);
  const cx0 = 150;
  const cx1 = 874;
  const cy0 = 290;
  const cy1 = 392;
  const tm = 120;
  const xs = (v: number) => cx0 + (v / tm) * (cx1 - cx0);
  const ys = (v: number) => cy1 - (v / 1100) * (cy1 - cy0);
  const path = series
    .map(([tv, v], i) => `${i === 0 ? "M" : "L"}${xs(tv).toFixed(1)},${ys(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 900 420"
      role="img"
      aria-label="Client ephemeral ports"
      className="viz-conn__svg"
    >
      <text x={10} y={18} className="viz-conn__ports-title">
        One port&apos;s life
      </text>
      {model.fix ? (
        <>
          <rect x={sx} y={8} width={sw} height={16} className="viz-conn__port-open" />
          <text x={sx + sw / 2} y={20} textAnchor="middle" className="viz-conn__port-strip-label">
            one connection, open and reused: nothing closes, nothing waits
          </text>
        </>
      ) : (
        <>
          <rect x={sx} y={8} width={sxs(0.6) - sx} height={16} className="viz-conn__port-open" />
          <rect
            x={sxs(0.6)}
            y={8}
            width={sxs(60.6) - sxs(0.6)}
            height={16}
            className="viz-conn__port-tw"
          />
          <rect
            x={sxs(60.6)}
            y={8}
            width={sxs(70) - sxs(60.6)}
            height={16}
            className="viz-conn__port-free"
          />
          <text x={sx + 4} y={38} className="viz-conn__tick">
            open
          </text>
          <text x={sxs(30)} y={20} textAnchor="middle" className="viz-conn__port-strip-label">
            {model.why
              ? "TIME_WAIT 60 s: a delayed old segment can't land in a new connection"
              : "TIME_WAIT 60 s (client closed first)"}
          </text>
          <text x={sxs(65)} y={20} textAnchor="middle" className="viz-conn__tick">
            free
          </text>
        </>
      )}
      <text x={10} y={66} className="viz-conn__ports-title">
        Ephemeral ports
      </text>
      <text x={10} y={82} className="viz-conn__tick">
        32768–60999
      </text>
      <text x={10} y={96} className="viz-conn__tick">
        1 cell ≈ 20 ports
      </text>
      {Array.from({ length: nCells }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = gx + c * cw;
        const y = gy + r * ch;
        const st = model.fix ? (i < 1 ? "use" : "free") : i < usedCells ? "tw" : "free";
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cw - 1.6}
            height={ch - 1.6}
            rx={1}
            className={`viz-conn__cell viz-conn__cell--${st}`}
          />
        );
      })}
      {full ? (
        <rect
          x={gx - 2}
          y={gy - 2}
          width={cols * cw + 2}
          height={rows * ch + 2}
          fill="none"
          className="viz-conn__grid-alert"
        />
      ) : null}
      <text x={10} y={cy0 + 10} className="viz-conn__ports-title">
        {model.fix ? "Requests" : "New connections"}
      </text>
      <text x={10} y={cy0 + 26} className="viz-conn__tick">
        that succeed, per s
      </text>
      {[0, 500, 1000].map((v) => (
        <g key={v}>
          <line x1={cx0} x2={cx1} y1={ys(v)} y2={ys(v)} className="viz-conn__chart-grid" />
          <text x={cx0 - 6} y={ys(v) + 4} textAnchor="end" className="viz-conn__tick">
            {v}
          </text>
        </g>
      ))}
      {[0, 20, 40, 60, 80, 100, 120].map((v) => (
        <text key={v} x={xs(v)} y={cy1 + 16} textAnchor="middle" className="viz-conn__tick">
          {v} s
        </text>
      ))}
      {!model.fix ? (
        <>
          <line
            x1={cx0}
            x2={cx1}
            y1={ys(CONN_PORTS_TOTAL / 60)}
            y2={ys(CONN_PORTS_TOTAL / 60)}
            className="viz-conn__chart-cap"
          />
          <text
            x={cx1 - 4}
            y={ys(CONN_PORTS_TOTAL / 60) - 5}
            textAnchor="end"
            className="viz-conn__chart-cap-label"
          >
            average ≈ 470/s = 28,232 ports ÷ 60 s
          </text>
        </>
      ) : null}
      {path ? (
        <path
          d={path}
          fill="none"
          className={model.fix ? "viz-conn__chart-line--fix" : "viz-conn__chart-line"}
        />
      ) : null}
      {!model.fix && t > 28.3 ? (
        <>
          <line x1={xs(28.2)} x2={xs(28.2)} y1={cy0} y2={cy1} className="viz-conn__chart-fail" />
          <text x={xs(28.2) + 5} y={cy0 + 8} className="viz-conn__chart-fail-label">
            Errno 99 from here
          </text>
        </>
      ) : null}
      {t < tm ? <line x1={xs(t)} x2={xs(t)} y1={cy0} y2={cy1} className="viz-conn__now" /> : null}
    </svg>
  );
}

function ladderSummary(model: ConnLadderModel) {
  const now = model.now ?? 0;
  const msgs = model.msgs ?? [];
  if (model.rtt != null) {
    return (
      <>
        <span>
          round trips to the response <b>{model.rtt}</b>
        </span>
        <span>
          at 100 ms RTT <b>≈ {model.rtt * 100} ms</b>
        </span>
        <span>
          packets shown <b>{msgs.filter((m) => m.t0 < now).length}</b>
        </span>
      </>
    );
  }
  const marks = model.marks ?? [];
  const ran = marks.filter((m) => m.col === "io" && /runs/.test(m.label)).length;
  const replay = marks.filter((m) => m.col === "alert").length;
  return (
    <>
      <span>
        servers that ran the POST <b>{ran + replay}</b>
      </span>
      <span>
        TLS-layer replay protection between connections <b>none</b>
      </span>
    </>
  );
}

function portsSummary(model: ConnLadderModel) {
  const t = model.t ?? 0;
  const { used } = portUsageAt(t, model.fix);
  return (
    <>
      <span>
        ports in TIME_WAIT <b>{model.fix ? 0 : Math.round(used).toLocaleString("en-US")}</b>
      </span>
      <span>
        free <b>{(CONN_PORTS_TOTAL - Math.round(used)).toLocaleString("en-US")}</b>
      </span>
      <span>
        connections open <b>{model.fix ? "a few" : "≈ 0 (each lasts ms)"}</b>
      </span>
      <span>
        server load <b>idle</b>
      </span>
    </>
  );
}

export function ConnLadderShape({ model }: { model: ConnLadderModel; subject: string }) {
  return (
    <div className="viz-conn" role="img" aria-label="Connection cost diagram">
      <div className="viz-conn__meta">
        <span className="viz-conn__clock">{clockLabel(model.clock)}</span>
        {model.badge ? (
          <span className={`viz-conn__badge${model.badgeBad ? " viz-conn__badge--bad" : ""}`}>
            {model.badge}
          </span>
        ) : null}
      </div>
      {model.term ? <pre className="viz-conn__term">{model.term}</pre> : null}
      <div className="viz-conn__tlwrap">
        {model.view === "ports" ? <PortsDiagram model={model} /> : <LadderDiagram model={model} />}
      </div>
      <div className="viz-conn__sum">
        {model.view === "ports" ? portsSummary(model) : ladderSummary(model)}
      </div>
    </div>
  );
}
