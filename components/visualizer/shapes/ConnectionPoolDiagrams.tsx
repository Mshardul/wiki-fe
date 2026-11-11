import type { ReactNode } from "react";
import type { ConnectionPoolModel } from "@/lib/visualizer/core/shapes";

const FLEET_ROWS = [
  [0, 3, 11, 12.5, 21, 27],
  [1, 8, 9, 17, 25],
  [2, 4, 6, 14, 22, 23, 29.5],
  [0.5, 5.5, 15, 19],
  [5, 7, 16, 20.5, 28],
  [3, 13, 19, 26],
];

function laneConnClass(st?: string): string {
  if (st === "rst") return "viz-cpool__conn viz-cpool__conn--rst";
  if (st === "fin") return "viz-cpool__conn viz-cpool__conn--fin";
  if (st === "dropped") return "viz-cpool__conn viz-cpool__conn--dropped";
  if (st === "active") return "viz-cpool__conn viz-cpool__conn--active";
  return "viz-cpool__conn viz-cpool__conn--idle";
}

export function ConnectionPoolLanesDiagram({ model }: { model: ConnectionPoolModel }) {
  const P = model.parties ?? [];
  const n = P.length;
  const H = 175 + n * 52 + 40;
  const BX = n === 3 ? [30, 370, 710] : [110, 630];
  const BW = 160;
  const BY = 30;
  const BH = 60;
  const L = model.lane ?? {};
  const x1 = (BX[0] ?? 0) + BW;
  const x2 = BX[n - 1] ?? 0;
  const ly = BY + BH / 2;
  const ax = model.axis ?? [0, 12, [0, 2, 4, 6, 8, 10, 12]];
  const X0 = 170;
  const X1 = 874;
  const xs = (t: number) => X0 + ((t - ax[0]) / (ax[1] - ax[0])) * (X1 - X0);
  const now = model.now ?? 0;
  const top = 175;

  return (
    <svg
      viewBox={`0 0 900 ${H}`}
      role="img"
      aria-label="Connection lane and idle timers"
      className="viz-cpool__svg"
    >
      <defs>
        {(["run", "alert", "io", "muted"] as const).map((k) => (
          <marker
            key={k}
            id={`viz-cpool-m-${k}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`viz-cpool__marker viz-cpool__marker--${k}`} />
          </marker>
        ))}
      </defs>
      {L.st && L.st !== "closed" ? (
        <line
          x1={x1}
          x2={x2}
          y1={ly}
          y2={ly}
          className={laneConnClass(L.st)}
          strokeWidth={L.st === "active" ? 4 : 3}
        />
      ) : null}
      {P.map((p, i) => {
        const bx = BX[i] ?? 0;
        return (
          <g key={`${p.name}-${i}`}>
            <rect
              x={bx}
              y={BY}
              width={BW}
              height={BH}
              rx={9}
              className={p.bad ? "viz-cpool__party viz-cpool__party--bad" : "viz-cpool__party"}
              fill={p.pass ? "none" : undefined}
              strokeDasharray={p.pass ? "4 3" : undefined}
            />
            {p.pass ? (
              <>
                <rect
                  x={bx + 8}
                  y={BY + 6}
                  width={BW - 16}
                  height={17}
                  rx={4}
                  className="viz-cpool__party-fill"
                />
                <rect
                  x={bx + 8}
                  y={BY + BH - 21}
                  width={BW - 16}
                  height={17}
                  rx={4}
                  className="viz-cpool__party-fill"
                />
              </>
            ) : null}
            <text x={bx + BW / 2} y={BY + 19} textAnchor="middle" className="viz-cpool__party-name">
              {p.name}
            </text>
            <text
              x={bx + BW / 2}
              y={BY + BH - 8}
              textAnchor="middle"
              className={
                p.bad ? "viz-cpool__party-view viz-cpool__party-view--bad" : "viz-cpool__party-view"
              }
            >
              {p.view ?? ""}
            </text>
          </g>
        );
      })}
      {L.note ? (
        <text
          x={450}
          y={BY + BH + 50}
          textAnchor="middle"
          className={
            L.st === "rst"
              ? "viz-cpool__lane-note viz-cpool__lane-note--bad"
              : "viz-cpool__lane-note"
          }
        >
          {L.note}
        </text>
      ) : null}
      {(L.arrows ?? []).map((a, i) => {
        const X1a =
          a.from < a.to ? (a.from === 0 ? x1 : (BX[a.from] ?? 0) + BW) : (BX[a.from] ?? 0);
        const X2a = a.from < a.to ? (BX[a.to] ?? 0) : (BX[a.to] ?? 0) + BW;
        const yy = a.y ?? 14;
        const col = a.col ?? "run";
        return (
          <g key={i}>
            <line
              x1={X1a}
              x2={X2a}
              y1={yy}
              y2={yy}
              className={`viz-cpool__arrow viz-cpool__arrow--${col}`}
              markerEnd={`url(#viz-cpool-m-${col})`}
            />
            <text
              x={(X1a + X2a) / 2}
              y={yy > 60 ? yy + 14 : yy - 4}
              textAnchor="middle"
              className={`viz-cpool__arrow-label viz-cpool__arrow-label--${col}`}
            >
              {a.label}
            </text>
          </g>
        );
      })}
      <text x={10} y={top - 10} className="viz-cpool__section-title">
        Idle timer per party
      </text>
      {ax[2].map((t) => (
        <g key={t}>
          <line x1={xs(t)} x2={xs(t)} y1={top} y2={top + n * 52} className="viz-cpool__grid" />
          <text x={xs(t)} y={top + n * 52 + 16} textAnchor="middle" className="viz-cpool__tick">
            {t} s
          </text>
        </g>
      ))}
      {P.map((p, i) => {
        const y = top + i * 52 + 8;
        const maxSeg = Math.max(0, ...(p.segs ?? []).map((g) => Math.min(g[1], now)));
        return (
          <g key={`timer-${p.name}`}>
            <text x={10} y={y + 14} className="viz-cpool__timer-name">
              {p.name}
            </text>
            <text x={10} y={y + 29} className="viz-cpool__tick">
              {p.limitTxt ?? ""}
            </text>
            <rect
              x={X0}
              y={y + 6}
              width={X1 - X0}
              height={22}
              rx={3}
              className="viz-cpool__timer-track"
            />
            {(p.segs ?? []).map(([a, b, st], si) => {
              const bb = Math.min(b, now);
              if (bb <= a) return null;
              const state = st ?? "idle";
              return (
                <g key={si}>
                  <rect
                    x={xs(a)}
                    y={y + 6}
                    width={Math.max(1.5, xs(bb) - xs(a))}
                    height={22}
                    rx={2}
                    className={`viz-cpool__timer-seg viz-cpool__timer-seg--${state}`}
                  />
                  {state === "gone" && xs(bb) - xs(a) > 110 ? (
                    <text x={xs(a) + 6} y={y + 21} className="viz-cpool__gone-label">
                      flow forgotten
                    </text>
                  ) : null}
                </g>
              );
            })}
            {p.limit != null && p.limit >= ax[0] && p.limit <= ax[1] ? (
              <>
                <line
                  x1={xs(p.limit)}
                  x2={xs(p.limit)}
                  y1={y}
                  y2={y + 34}
                  className="viz-cpool__limit-line"
                />
                {p.limitLab ? (
                  <text
                    x={xs(p.limit) + (p.labLeft ? -5 : 5)}
                    y={y + 3}
                    textAnchor={p.labLeft ? "end" : "start"}
                    className="viz-cpool__limit-label"
                  >
                    {p.limitLab}
                  </text>
                ) : null}
              </>
            ) : p.offTxt && maxSeg < ax[0] + (ax[1] - ax[0]) * 0.7 ? (
              <text x={X1 - 4} y={y + 21} textAnchor="end" className="viz-cpool__tick">
                {p.offTxt}
              </text>
            ) : null}
          </g>
        );
      })}
      {(model.ev ?? []).map((e, i) => {
        if (e.t > now + 1e-9) return null;
        const x = xs(e.t);
        const col = e.col ?? "run";
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={top - 4}
              y2={top + n * 52}
              className={`viz-cpool__ev-line viz-cpool__ev-line--${col}`}
            />
            <circle
              cx={x}
              cy={top - 4}
              r={4}
              className={`viz-cpool__ev-dot viz-cpool__ev-dot--${col}`}
            />
            {e.label ? (
              <text
                x={x + (e.left ? -6 : 6)}
                y={top - 6}
                textAnchor={e.left ? "end" : "start"}
                className={`viz-cpool__ev-label viz-cpool__ev-label--${col}`}
              >
                {e.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {now < ax[1] ? (
        <g>
          <line x1={xs(now)} x2={xs(now)} y1={top} y2={top + n * 52} className="viz-cpool__now" />
          <text x={xs(now)} y={top + n * 52 + 30} textAnchor="middle" className="viz-cpool__tick">
            now
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function fleetStats(): { closes: number; races: number } {
  const END = 30;
  let closes = 0;
  let races = 0;
  for (const reqs of FLEET_ROWS) {
    for (let k = 0; k < reqs.length; k++) {
      const t = reqs[k]!;
      const nx = reqs[k + 1] ?? END;
      const closeT = t + 5;
      if (nx >= closeT - 0.001 || (k === reqs.length - 1 && END > closeT)) {
        if (closeT < END) {
          closes++;
          if (Math.abs(nx - closeT) < 0.01) races++;
        }
      }
    }
  }
  return { closes, races };
}

export function ConnectionPoolFleetDiagram() {
  const END = 30;
  const X0 = 110;
  const X1 = 874;
  const xs = (t: number) => X0 + (t / END) * (X1 - X0);
  const raceLabels: { x: number; y: number }[] = [];

  return (
    <svg
      viewBox={`0 0 900 ${70 + FLEET_ROWS.length * 34}`}
      role="img"
      aria-label="Connections in the ALB pool under light traffic"
      className="viz-cpool__svg"
    >
      <text x={10} y={18} className="viz-cpool__section-title">
        ALB → target connections, light traffic (0–30 s)
      </text>
      {[0, 5, 10, 15, 20, 25, 30].map((t) => (
        <g key={t}>
          <line
            x1={xs(t)}
            x2={xs(t)}
            y1={28}
            y2={34 + FLEET_ROWS.length * 34}
            className="viz-cpool__grid"
          />
          <text
            x={xs(t)}
            y={50 + FLEET_ROWS.length * 34}
            textAnchor="middle"
            className="viz-cpool__tick"
          >
            {t} s
          </text>
        </g>
      ))}
      {FLEET_ROWS.map((reqs, i) => {
        const y = 34 + i * 34;
        return (
          <g key={i}>
            <text x={10} y={y + 16} className="viz-cpool__timer-name">
              {`conn ${i + 1}`}
            </text>
            <rect
              x={X0}
              y={y + 4}
              width={X1 - X0}
              height={18}
              rx={3}
              className="viz-cpool__timer-track"
            />
            {reqs.map((t, k) => {
              const nx = reqs[k + 1] ?? END;
              const closeT = t + 5;
              const elems: ReactNode[] = [];
              if (nx >= closeT - 0.001 || (k === reqs.length - 1 && END > closeT)) {
                elems.push(
                  <rect
                    key={`idle-${k}`}
                    x={xs(t)}
                    y={y + 4}
                    width={xs(Math.min(closeT, END)) - xs(t)}
                    height={18}
                    className="viz-cpool__timer-seg viz-cpool__timer-seg--idle"
                  />,
                );
                if (closeT < END) {
                  const race = Math.abs(nx - closeT) < 0.01;
                  elems.push(
                    <path
                      key={`close-${k}`}
                      d={`M${xs(closeT)},${y + 2} l5,11 l-5,11 l-5,-11 z`}
                      className={
                        race ? "viz-cpool__diamond viz-cpool__diamond--bad" : "viz-cpool__diamond"
                      }
                    />,
                  );
                  if (race) raceLabels.push({ x: xs(closeT) + 8, y: y + 5 });
                }
              } else {
                elems.push(
                  <rect
                    key={`idle-${k}`}
                    x={xs(t)}
                    y={y + 4}
                    width={xs(nx) - xs(t)}
                    height={18}
                    className="viz-cpool__timer-seg viz-cpool__timer-seg--idle"
                  />,
                );
              }
              elems.push(
                <rect
                  key={`req-${k}`}
                  x={xs(t) - 1.5}
                  y={y + 1}
                  width={3}
                  height={24}
                  className="viz-cpool__req-mark"
                />,
              );
              return elems;
            })}
          </g>
        );
      })}
      {raceLabels.map((l, i) => (
        <g key={i}>
          <rect x={l.x} y={l.y} width={170} height={16} rx={3} className="viz-cpool__race-bg" />
          <text x={l.x + 4} y={l.y + 12} className="viz-cpool__race-label">
            request hit the FIN → 502
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ConnectionPoolSlotsDiagram({ model }: { model: ConnectionPoolModel }) {
  const slots = model.slots ?? 10;
  const busy = model.busy ?? 0;
  const queue = model.queue ?? 0;
  const now = model.now ?? 0;
  const fix = model.fix;
  const t0 = -4;
  const t1 = 14;
  const X0 = 60;
  const X1 = 874;
  const Y0 = 118;
  const Y1 = 292;
  const xs = (t: number) => X0 + ((t - t0) / (t1 - t0)) * (X1 - X0);
  const YM = 6;
  const ys = (v: number) => Y1 - (Math.min(v, YM) / YM) * (Y1 - Y0);
  const lat = (t: number) => (fix ? 0.05 : t < 0 ? 0.05 : Math.min(0.5 * t, 5) + 0.05);
  const sw = Math.min(34, (400 - (slots - 1) * 6) / slots);
  const dots = Math.min(60, Math.round(queue / 10));

  let path = "";
  for (let t = t0; t <= Math.min(now, t1); t += 0.05) {
    path += `${path ? " L" : "M"}${xs(t).toFixed(1)},${ys(lat(t)).toFixed(1)}`;
  }

  return (
    <svg
      viewBox="0 0 900 330"
      role="img"
      aria-label="Connection pool slots and latency"
      className="viz-cpool__svg"
    >
      <text x={10} y={20} className="viz-cpool__section-title">{`Pool: ${slots} connections`}</text>
      {Array.from({ length: slots }, (_, i) => {
        const x = 10 + i * (sw + 6);
        const fillFrac = Math.max(0, Math.min(1, busy - i));
        return (
          <g key={i}>
            <rect x={x} y={32} width={sw} height={34} rx={5} className="viz-cpool__slot" />
            {fillFrac > 0 ? (
              <rect
                x={x}
                y={32}
                width={sw * fillFrac}
                height={34}
                rx={5}
                className="viz-cpool__slot-busy"
              />
            ) : null}
          </g>
        );
      })}
      <text x={10} y={84} className="viz-cpool__tick">
        {`${busy % 1 ? busy.toFixed(1) : busy} busy on average · needs rate × 0.05 s = ${model.need ?? ""}`}
      </text>
      <text x={470} y={20} className="viz-cpool__section-title">
        Waiting for a connection
      </text>
      {Array.from({ length: dots }, (_, i) => {
        const x = 470 + (i % 30) * 13.5;
        const y = 36 + Math.floor(i / 30) * 15;
        return <circle key={i} cx={x + 5} cy={y + 5} r={4.5} className="viz-cpool__queue-dot" />;
      })}
      <text
        x={470}
        y={84}
        className={queue ? "viz-cpool__tick" : "viz-cpool__tick viz-cpool__tick--muted"}
      >
        {queue
          ? `${queue.toLocaleString("en-US")} queued (each dot ≈ 10 requests)`
          : "nobody waiting"}
      </text>
      <text x={X0} y={Y0 - 8} className="viz-cpool__tick">
        latency seen by the caller (wait for connection + 50 ms call)
      </text>
      {[0, 1, 2, 3, 4, 5, 6].map((v) => (
        <g key={v}>
          <line x1={X0} x2={X1} y1={ys(v)} y2={ys(v)} className="viz-cpool__chart-grid" />
          <text x={X0 - 6} y={ys(v) + 4} textAnchor="end" className="viz-cpool__tick">
            {v} s
          </text>
        </g>
      ))}
      {[-4, -2, 0, 2, 4, 6, 8, 10, 12, 14].map((t) => (
        <text key={t} x={xs(t)} y={Y1 + 16} textAnchor="middle" className="viz-cpool__tick">
          {(t > 0 ? "+" : "") + t} s
        </text>
      ))}
      <line x1={X0} x2={X1} y1={ys(5)} y2={ys(5)} className="viz-cpool__pool-timeout-line" />
      <text x={X0 + 6} y={ys(5) - 5} className="viz-cpool__pool-timeout-label">
        pool timeout 5 s → PoolTimeout
      </text>
      <line x1={xs(0)} x2={xs(0)} y1={Y0} y2={Y1} className="viz-cpool__traffic-line" />
      <text x={xs(0) + 4} y={Y0 + 10} className="viz-cpool__tick">
        {fix ? "traffic doubles (pool of 20)" : "traffic doubles"}
      </text>
      {path ? <path d={path} fill="none" className="viz-cpool__latency-line" /> : null}
      {!fix && now > 10 ? (
        <>
          <rect
            x={xs(10)}
            y={Y0}
            width={xs(Math.min(now, t1)) - xs(10)}
            height={Y1 - Y0}
            className="viz-cpool__fail-zone"
          />
          <text x={xs(10) + 6} y={ys(5) + 18} className="viz-cpool__fail-label">
            ≈ 1 in 3 requests fail
          </text>
        </>
      ) : null}
      {now < t1 ? (
        <circle cx={xs(now)} cy={ys(lat(now))} r={5} className="viz-cpool__latency-now" />
      ) : null}
    </svg>
  );
}
