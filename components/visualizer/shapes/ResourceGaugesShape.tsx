import type {
  CpuTimelineModel,
  ResourceCardRow,
  ResourceGaugeRow,
  ResourceGaugesModel,
} from "@/lib/visualizer/core/shapes";

function fmtResource(kind: "cpu" | "mem", v: number): string {
  if (kind === "cpu") {
    return v >= 1000 && v % 1000 === 0 ? `${v / 1000} CPU` : `${v}m`;
  }
  return v >= 1024 ? `${(v / 1024).toFixed(v % 1024 ? 1 : 0)} GiB` : `${Math.round(v)} MiB`;
}

function gaugeMax(g: ResourceGaugeRow): number {
  return g.max || Math.max(g.lim || 0, g.use, g.req || 0) * 1.15 || 1;
}

function pct(g: ResourceGaugeRow, v: number): number {
  return Math.min(100, (v / gaugeMax(g)) * 100);
}

function Gauge({ g }: { g: ResourceGaugeRow }) {
  const hit = g.lim != null && g.use >= g.lim;
  const over = g.req != null && g.use > g.req;
  const fillCls = g.plain ? "" : hit ? "hit" : over ? "over" : "";
  const parts: string[] = [fmtResource(g.kind, g.use)];
  if (g.add) parts.push(`+ ${fmtResource(g.kind, g.add)} incoming`);
  if (g.req != null) parts.push(`request ${fmtResource(g.kind, g.req)}`);
  if (g.lim != null) {
    parts.push(
      `${g.max && g.req == null && g.lim === g.max ? "capacity" : "limit"} ${fmtResource(g.kind, g.lim)}`,
    );
  } else if (g.req == null) parts.push("no request · no limit");

  const addW = g.add != null ? Math.min(pct(g, g.add), 100 - pct(g, g.use)) : 0;
  const addHot = g.add != null && g.use + g.add > (g.lim ?? Infinity);

  return (
    <div className="viz-rg__gauge">
      <div className="viz-rg__glab">
        <span>{g.label}</span>
        <span>
          <b>{parts[0]}</b>
          {parts.length > 1 ? ` · ${parts.slice(1).join(" · ")}` : null}
        </span>
      </div>
      <div className="viz-rg__track">
        <span className={`viz-rg__fill ${fillCls}`} style={{ width: `${pct(g, g.use)}%` }} />
        {g.add != null ? (
          <span
            className={`viz-rg__fill viz-rg__fill--add${addHot ? " viz-rg__fill--add-hot" : ""}`}
            style={{ left: `${pct(g, g.use)}%`, width: `${addW}%` }}
          />
        ) : null}
        {g.req != null ? (
          <span className="viz-rg__mk viz-rg__mk--req" style={{ left: `${pct(g, g.req)}%` }} />
        ) : null}
        {g.lim != null ? (
          <span
            className="viz-rg__mk viz-rg__mk--lim"
            style={{ left: `calc(${pct(g, g.lim)}% - 2px)` }}
          />
        ) : null}
        {g.thr != null ? (
          <span
            className="viz-rg__mk viz-rg__mk--thr"
            style={{ left: `${pct(g, g.thr)}%` }}
            title={g.thrLabel ?? ""}
          />
        ) : null}
      </div>
      {g.thr != null && g.thrLabel ? (
        <div className="viz-rg__glab">
          <span />
          <span>{g.thrLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function ResourceCard({ c, isNode }: { c: ResourceCardRow; isNode: boolean }) {
  const st = c.st ? ` viz-rg__card--${c.st}` : "";
  return (
    <div className={`viz-rg__card${st}${c.on ? " viz-rg__card--on" : ""}`}>
      <div className="viz-rg__chead">
        <span>{isNode ? c.n : (c.pod ?? c.n)}</span>
        <small>
          {isNode ? c.sub : c.qos}
          {c.restarts ? ` · restarts ${c.restarts}` : ""}
          {c.status ? ` · ${c.status}` : ""}
        </small>
      </div>
      {c.g.map((g, i) => (
        <Gauge key={`${g.label}-${i}`} g={g} />
      ))}
      {c.note ? (
        <span className={`viz-rg__cnote${c.bad ? " viz-rg__cnote--bad" : ""}`}>{c.note}</span>
      ) : null}
    </div>
  );
}

function CpuPeriodTimeline({ tl }: { tl: CpuTimelineModel }) {
  const W = 720;
  const L = 76;
  const R = 16;
  const top = 30;
  const lh = 30;
  const n = tl.lanes.length;
  const H = top + n * lh + 30;
  const x = (t: number) => L + (t / 300) * (W - L - R);

  const periodLabels = [0, 1, 2].map((p) => {
    const used = tl.lanes.reduce(
      (a, l) =>
        a +
        l.segs
          .filter((s) => s[2] === "run")
          .reduce(
            (b, s) => b + Math.max(0, Math.min(s[1], (p + 1) * 100) - Math.max(s[0], p * 100)),
            0,
          ),
      0,
    );
    return { p, used: +used.toFixed(1) };
  });

  return (
    <div className="viz-rg__tlwrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="CPU periods timeline">
        <defs>
          <pattern
            id="viz-rg-thr"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" className="viz-rg__thr-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="viz-rg__thr-line" />
          </pattern>
        </defs>
        {periodLabels.map(({ p, used }) => (
          <text key={p} x={x(p * 100 + 50)} y={14} textAnchor="middle" className="viz-rg__tl-meta">
            {`period ${p + 1} · quota used ${used}/50 ms`}
          </text>
        ))}
        {[0, 100, 200, 300].map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={20} x2={x(t)} y2={H - 18} className="viz-rg__tl-grid" />
            <text x={x(t)} y={H - 5} textAnchor="middle" className="viz-rg__tl-meta">
              {t} ms{t > 0 && t < 300 ? " · quota refilled" : ""}
            </text>
          </g>
        ))}
        {tl.lanes.map((lane, i) => {
          const y = top + i * lh;
          return (
            <g key={lane.n}>
              <text x={L - 8} y={y + 15} textAnchor="end" className="viz-rg__tl-lane">
                {lane.n}
              </text>
              <line x1={L} y1={y + 11} x2={W - R} y2={y + 11} className="viz-rg__tl-baseline" />
              {lane.segs.map((s, si) => {
                const w = Math.max(x(s[1]) - x(s[0]), 1);
                if (s[2] === "run") {
                  return (
                    <rect
                      key={si}
                      x={x(s[0])}
                      y={y}
                      width={w}
                      height={22}
                      rx={2}
                      className="viz-rg__tl-run"
                    />
                  );
                }
                return (
                  <g key={si}>
                    <rect
                      x={x(s[0]) + 0.5}
                      y={y + 0.5}
                      width={w - 1}
                      height={21}
                      rx={2}
                      fill="url(#viz-rg-thr)"
                      className="viz-rg__tl-thr-rect"
                    />
                    {w > 70 ? (
                      <text
                        x={x(s[0]) + w / 2}
                        y={y + 15}
                        textAnchor="middle"
                        className="viz-rg__tl-thr-label"
                      >
                        throttled
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
        {(tl.marks ?? []).map((m) => {
          const anchor = m.t > 250 ? "end" : "start";
          return (
            <g key={`${m.t}-${m.l}`}>
              <line
                x1={x(m.t)}
                y1={top - 6}
                x2={x(m.t)}
                y2={top + n * lh}
                className="viz-rg__tl-mark"
              />
              <text
                x={x(m.t) + (anchor === "end" ? -4 : 4)}
                y={top + n * lh + 8}
                textAnchor={anchor}
                className="viz-rg__tl-mark-label"
              >
                {m.l}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ResourceGaugesShape({ model }: { model: ResourceGaugesModel; subject: string }) {
  return (
    <div className="viz-rg" role="img" aria-label="Pod resource gauges">
      {model.badge ? (
        <p className={`viz-rg__badge${model.badgeBad ? " viz-rg__badge--bad" : ""}`}>
          {model.badge}
        </p>
      ) : null}
      {model.term ? <pre className="viz-rg__term">{model.term}</pre> : null}
      {model.nodes.length > 0 ? (
        <div>
          <p className="viz-rg__colttl">{model.nodesTitle ?? "Nodes"}</p>
          <div className="viz-rg__grid">
            {model.nodes.map((c, i) => (
              <ResourceCard key={`${c.n}-${i}`} c={c} isNode />
            ))}
          </div>
        </div>
      ) : null}
      {model.timeline ? (
        <div>
          <p className="viz-rg__colttl">CPU time, in 100 ms periods (quota 50 ms per period)</p>
          <CpuPeriodTimeline tl={model.timeline} />
        </div>
      ) : null}
      {model.sum.length > 0 ? (
        <div className="viz-rg__sum">
          {model.sum.map((s) => (
            <span key={s}>
              <b>{s}</b>
            </span>
          ))}
        </div>
      ) : null}
      <div>
        <p className="viz-rg__colttl">Containers</p>
        <div className="viz-rg__grid">
          {model.containers.map((c, i) => (
            <ResourceCard key={`${c.pod ?? c.n}-${i}`} c={c} isNode={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
