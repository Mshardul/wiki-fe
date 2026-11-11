import type { HttpPipelineModel } from "@/lib/visualizer/core/shapes";

const VW = 380;
const BX = 46;
const BW = 288;
const BH = 50;
const TOP = 16;
const GAP = 66;
const LX = 22;
const RX = VW - 22;

function layout(order: string[]) {
  const yOf: Record<string, number> = {};
  order.forEach((id, i) => {
    yOf[id] = TOP + i * GAP + (i >= 4 ? 14 : 0);
  });
  const H = yOf[order[order.length - 1]!]! + BH + 24;
  const cy = (id: string) => yOf[id]! + BH / 2;
  return { yOf, H, cy };
}

function nodeSubtitle(model: HttpPipelineModel, id: string, base: string): string {
  if (id === "nginx" && model.nginxMaxBody) return model.nginxMaxBody;
  const lim = model.limits?.[id];
  if (lim != null) {
    const prefix = id === "alb" ? "idle " : id === "nginx" ? "read timeout " : "timeout ";
    return `${prefix}${lim} s`;
  }
  return base;
}

export function HttpPipelineShape({ model }: { model: HttpPipelineModel; subject: string }) {
  const {
    order,
    nodes,
    down,
    up,
    active,
    token,
    notes,
    skip = [],
    fail = [],
    workers,
    limits,
    clock,
    fired = [],
    status,
    statusErr,
    banner,
    buffer,
  } = model;
  const skipSet = new Set(skip);
  const failSet = new Set(fail);
  const firedSet = new Set(fired);
  const { yOf, H, cy } = layout(order);
  const mwIds = order.filter((id) => nodes[id]?.mw);
  const fy = yOf[mwIds[0]!]! - 14;
  const fh = yOf[mwIds[mwIds.length - 1]!]! + BH + 8 - fy;
  const bannerW = banner ? 190 : 122;
  const bannerLabel = banner ? `Django · ${banner}` : "Django · MIDDLEWARE";
  const tw = Math.max(58, token.t.length * 7 + 16);
  const tx = BX + BW - 10;
  const ty = yOf[token.at]! - 4;
  const tokenX = tx - tw;
  const tokenY = ty - 9;
  const tokenFill = token.err
    ? "var(--viz-http-alert)"
    : token.res
      ? "var(--viz-http-res)"
      : "var(--viz-http-req)";

  return (
    <svg
      className="viz-http"
      viewBox={`0 0 ${VW} ${H}`}
      role="img"
      aria-label="HTTP request pipeline"
    >
      <defs>
        <marker
          id="viz-http-ad"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" className="viz-http__marker--req" />
        </marker>
        <marker
          id="viz-http-au"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" className="viz-http__marker--res" />
        </marker>
        <pattern
          id="viz-http-buf"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" className="viz-http__buf-bg" />
          <line x1="0" y1="0" x2="0" y2="6" className="viz-http__buf-line" />
        </pattern>
      </defs>

      <rect
        x={BX - 8}
        y={fy}
        width={BW + 16}
        height={fh}
        rx={10}
        className="viz-http__django-frame"
      />
      <rect
        x={BX + 4}
        y={fy - 8}
        width={bannerW}
        height={16}
        rx={3}
        className="viz-http__banner-bg"
      />
      <text
        x={BX + 8}
        y={fy + 4}
        fontSize={10.5}
        className={`viz-http__banner-text${banner ? " viz-http__banner-text--alert" : ""}`}
      >
        {bannerLabel}
      </text>

      {down.length > 1 ? (
        <line
          x1={LX}
          y1={cy(down[0]!)}
          x2={LX}
          y2={cy(down[down.length - 1]!) - 6}
          markerEnd="url(#viz-http-ad)"
          className="viz-http__fade viz-http__rail--req"
        />
      ) : null}
      {down.map((id) => (
        <g key={`d-${id}`}>
          <line x1={LX} y1={cy(id)} x2={BX} y2={cy(id)} className="viz-http__spoke--req" />
          <circle cx={LX} cy={cy(id)} r={3} className="viz-http__dot--req" />
        </g>
      ))}

      {up.length > 1 ? (
        <line
          x1={RX}
          y1={cy(up[0]!)}
          x2={RX}
          y2={cy(up[up.length - 1]!) + 6}
          markerEnd="url(#viz-http-au)"
          className="viz-http__fade viz-http__rail--res"
        />
      ) : null}
      {up.map((id) => (
        <g key={`u-${id}`}>
          <line x1={BX + BW} y1={cy(id)} x2={RX} y2={cy(id)} className="viz-http__spoke--res" />
          <circle cx={RX} cy={cy(id)} r={3} className="viz-http__dot--res" />
        </g>
      ))}

      {order.map((id) => {
        const n = nodes[id]!;
        const y = yOf[id]!;
        const isSkip = skipSet.has(id);
        const isFail = failSet.has(id);
        const isActive = active === id;
        const touched = down.includes(id) || up.includes(id);
        const note = notes?.[id];
        const limit = limits?.[id];
        const fill = buffer === id ? "url(#viz-http-buf)" : "var(--surface)";
        let opacity = 1;
        if (isSkip) opacity = 0.55;
        else if (!touched) opacity = 0.6;

        const rectClass = [
          "viz-http__node",
          isSkip ? "viz-http__node--skip" : "",
          isFail ? "viz-http__node--fail" : "",
          isActive ? "viz-http__node--active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g key={id} className="viz-http__fade" opacity={opacity}>
            <rect
              x={BX}
              y={y}
              width={BW}
              height={BH}
              rx={7}
              style={{ fill }}
              className={rectClass}
            />
            <text
              x={BX + 12}
              y={y + 20}
              fontSize={13.5}
              fontWeight={600}
              className="viz-http__name"
            >
              {n.name}
            </text>
            <text
              x={BX + BW - 10}
              y={y + 20}
              textAnchor="end"
              fontSize={10.5}
              className="viz-http__sub"
            >
              {nodeSubtitle(model, id, n.sub)}
            </text>
            {note ? (
              <text
                x={BX + 12}
                y={y + 38}
                fontSize={11}
                className={
                  isFail
                    ? "viz-http__note--fail"
                    : isSkip
                      ? "viz-http__note--skip"
                      : "viz-http__note"
                }
              >
                {note}
              </text>
            ) : null}
            {limit != null ? (
              <>
                <rect
                  x={BX + 12}
                  y={y + BH - 8}
                  width={BW - 24}
                  height={4}
                  rx={2}
                  className="viz-http__meter-bg"
                />
                <rect
                  x={BX + 12}
                  y={y + BH - 8}
                  width={Math.max(((BW - 24) * Math.min(clock ?? 0, limit)) / limit, 1)}
                  height={4}
                  rx={2}
                  className={firedSet.has(id) ? "viz-http__meter--fired" : "viz-http__meter"}
                />
              </>
            ) : null}
            {id === "gunicorn" && workers ? (
              <g>
                {workers.map((s, k) => (
                  <rect
                    key={k}
                    x={BX + BW - 56 + k * 12}
                    y={y + 30}
                    width={8}
                    height={8}
                    rx={1.5}
                    className={
                      s === 2
                        ? "viz-http__worker--killed"
                        : s === 1
                          ? "viz-http__worker--busy"
                          : "viz-http__worker--idle"
                    }
                  />
                ))}
              </g>
            ) : null}
            {id === "client" && status ? (
              <g>
                <rect
                  x={BX + BW - 74}
                  y={y + 27}
                  width={62}
                  height={18}
                  rx={9}
                  className={statusErr ? "viz-http__status--err" : "viz-http__status--ok"}
                />
                <text
                  x={BX + BW - 43}
                  y={y + 40}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={600}
                  className="viz-http__status-text"
                >
                  {status}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {clock != null ? (
        <text
          x={VW - 22}
          y={H - 6}
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
          className="viz-http__clock"
        >
          t = {clock} s
        </text>
      ) : null}

      <g style={{ transform: `translate(${tokenX}px, ${tokenY}px)` }} className="viz-http__token">
        <rect width={tw} height={18} rx={9} style={{ fill: tokenFill }} />
        <text
          x={tw / 2}
          y={13}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          className="viz-http__token-text"
        >
          {token.t}
        </text>
      </g>
    </svg>
  );
}
