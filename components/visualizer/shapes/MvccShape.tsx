import type { ReactNode } from "react";
import type {
  MvccIndex,
  MvccModel,
  MvccPageCells,
  MvccTuple,
  MvccTxn,
} from "@/lib/visualizer/core/shapes";

const XID_MAX = 4_294_967_296;

function formatXid(now: number): string {
  if (now >= 1e9) return `${(now / 1e9).toFixed(3)} B`;
  if (now >= 1e6) return `${(now / 1e6).toFixed(1)} M`;
  return now.toLocaleString();
}

function TxnStrip({ txns }: { txns: MvccTxn[] }) {
  return (
    <div className="viz-mvcc__txns">
      <span className="viz-mvcc__txlabel">Transactions</span>
      {txns.length === 0 ? (
        <span className="viz-mvcc__tx">none</span>
      ) : (
        txns.map((t) => (
          <span key={t.id} className={`viz-mvcc__tx viz-mvcc__tx--${t.st}`}>
            xid {t.id} · {t.st === "idle" ? "idle" : t.st}
            {t.n ? ` · ${t.n}` : ""}
          </span>
        ))
      )}
    </div>
  );
}

function TupleRow({ t }: { t: MvccTuple }) {
  const cls =
    t.state === "new"
      ? "viz-mvcc__tup--new"
      : t.state === "live"
        ? "viz-mvcc__tup--live"
        : t.state === "free"
          ? "viz-mvcc__tup--free"
          : "viz-mvcc__tup--dead";
  return (
    <div className={`viz-mvcc__tup ${cls}`}>
      <span>{t.slot}</span>
      <span className="viz-mvcc__val">
        {t.val}
        {t.sub ? <span className="viz-mvcc__sub">{t.sub}</span> : null}
      </span>
      <span>{t.xmin}</span>
      <span>{t.xmax}</span>
    </div>
  );
}

function PagePanel({
  tuples,
  table,
  full,
  log,
}: {
  tuples: MvccTuple[];
  table?: string;
  full?: boolean;
  log?: string;
}) {
  return (
    <div className="viz-mvcc__panel">
      <div className="viz-mvcc__ptitle">
        <span>Heap page 1{full ? " · full" : ""}</span>
        <span>{table ?? "accounts"}</span>
      </div>
      <div className="viz-mvcc__tup viz-mvcc__tup--hdr">
        <span>slot</span>
        <span>version</span>
        <span>xmin</span>
        <span>xmax</span>
      </div>
      {tuples.map((t) => (
        <TupleRow key={String(t.slot)} t={t} />
      ))}
      {log ? <div className="viz-mvcc__log">{log}</div> : null}
    </div>
  );
}

function IndexPanel({
  indexes,
  badge,
  good,
}: {
  indexes: MvccIndex[];
  badge?: string;
  good?: boolean;
}) {
  return (
    <div className="viz-mvcc__panel">
      <div className="viz-mvcc__ptitle">
        <span>Indexes</span>
      </div>
      {indexes.map((i) => (
        <div key={i.n} className="viz-mvcc__idx">
          <span className="viz-mvcc__iname">{i.n}</span>
          {i.e.map((e) => (
            <div
              key={`${e.k}-${e.s}`}
              className={`viz-mvcc__ent${e.nw ? " viz-mvcc__ent--new" : ""}${e.stale ? " viz-mvcc__ent--stale" : ""}`}
            >
              <span>{e.k}</span>
              <span>→ {e.s}</span>
            </div>
          ))}
        </div>
      ))}
      {badge ? (
        <span className={`viz-mvcc__badge${good ? " viz-mvcc__badge--good" : ""}`}>{badge}</span>
      ) : null}
    </div>
  );
}

function PageView({ model }: { model: MvccModel }) {
  const tuples = model.tuples ?? [];
  const page = (
    <PagePanel
      tuples={tuples}
      table={model.idx ? "users" : model.table}
      full={model.full}
      log={model.log}
    />
  );
  if (!model.idx) {
    return <div className="viz-mvcc__view viz-mvcc__view--solo">{page}</div>;
  }
  return (
    <div className="viz-mvcc__view">
      {page}
      <IndexPanel indexes={model.indexes ?? []} badge={model.badge} good={model.good} />
    </div>
  );
}

function PagesView({ model }: { model: MvccModel }) {
  const c: MvccPageCells = model.cells ?? { live: 0, pinned: 0, free: 0 };
  const cells: ReactNode[] = [];
  for (let i = 0; i < c.live; i++)
    cells.push(<i key={`l${i}`} className="viz-mvcc__cell viz-mvcc__cell--live" />);
  for (let i = 0; i < c.pinned; i++)
    cells.push(<i key={`p${i}`} className="viz-mvcc__cell viz-mvcc__cell--pinned" />);
  for (let i = 0; i < c.free; i++)
    cells.push(<i key={`f${i}`} className="viz-mvcc__cell viz-mvcc__cell--free" />);
  const pages = model.pages ?? 1;
  return (
    <div className="viz-mvcc__view viz-mvcc__view--solo">
      <div className="viz-mvcc__panel">
        <div className="viz-mvcc__ptitle">
          <span>Table {model.table ?? "accounts"} · every tuple slot</span>
          <span>
            {pages} page{pages > 1 ? "s" : ""} on disk
          </span>
        </div>
        <div className="viz-mvcc__grid">{cells}</div>
        <p className="viz-mvcc__pagesbar">
          {c.live} live · {c.pinned} dead, pinned · {c.free} free
        </p>
        {model.log ? <div className="viz-mvcc__log">{model.log}</div> : null}
      </div>
    </div>
  );
}

function XidView({ model }: { model: MvccModel }) {
  const W = 640;
  const L = 30;
  const R = 20;
  const y = 70;
  const now = model.now ?? 0;
  const x = (v: number) => L + (Math.max(0, Math.min(v, XID_MAX)) / XID_MAX) * (W - L - R);
  const past0 = Math.max(0, now - 2_147_483_648);
  const rowX = x(1000);
  const visible = model.frozen || (1000 >= past0 && 1000 <= now);
  const rowClass = model.lost
    ? "viz-mvcc__xidrow--lost"
    : model.frozen
      ? "viz-mvcc__xidrow--frozen"
      : "viz-mvcc__xidrow--ok";

  const rowText = model.lost
    ? "row xmin 1,000 · now looks like the future → invisible"
    : model.frozen
      ? "row xmin 1,000 · FROZEN, always visible"
      : "row xmin 1,000 · visible";

  const nowAnchor = x(now) > W - 160 ? "end" : "start";
  const nowDx = nowAnchor === "end" ? -6 : 6;

  return (
    <div className="viz-mvcc__view viz-mvcc__view--solo">
      <div className="viz-mvcc__panel">
        <div className="viz-mvcc__ptitle">
          <span>Transaction ID space (32-bit, unrolled)</span>
          <span>{visible && !model.lost ? "row visible" : "row lost"}</span>
        </div>
        <div className="viz-mvcc__xidwrap">
          <svg viewBox={`0 0 ${W} 150`} role="img" aria-label="Transaction ID number line">
            <rect
              className="viz-mvcc__xidtrack"
              x={L}
              y={y - 10}
              width={W - L - R}
              height={20}
              rx={4}
            />
            <rect
              className="viz-mvcc__xidpast"
              x={x(past0)}
              y={y - 10}
              width={x(now) - x(past0)}
              height={20}
            />
            <text
              className="viz-mvcc__xidpastlabel"
              x={(x(past0) + x(now)) / 2}
              y={y + 4}
              textAnchor="middle"
            >
              past: 2.1 billion IDs
            </text>
            {now < XID_MAX - 1 ? (
              <text
                className="viz-mvcc__xidfuture"
                x={(x(now) + x(Math.min(XID_MAX, now + 2_147_483_648))) / 2}
                y={y + 4}
                textAnchor="middle"
              >
                future
              </text>
            ) : null}
            <line className="viz-mvcc__xidnow" x1={x(now)} y1={y - 24} x2={x(now)} y2={y + 24} />
            <text
              className="viz-mvcc__xidnowlabel"
              x={x(now) + nowDx}
              y={y - 28}
              textAnchor={nowAnchor}
            >
              now = {formatXid(now)}
            </text>
            <circle className={rowClass} cx={rowX} cy={y + 36} r={6} />
            <line className={rowClass} x1={rowX} y1={y + 10} x2={rowX} y2={y + 30} />
            <text className={rowClass} x={rowX + 12} y={y + 40}>
              {rowText}
            </text>
            {model.trigger ? (
              <text className="viz-mvcc__xidwarn" x={x(now) + 6} y={y + 64}>
                age &gt; autovacuum_freeze_max_age (200M) → anti-wraparound vacuum
              </text>
            ) : null}
            {model.danger ? (
              <>
                <line
                  className="viz-mvcc__xiddanger"
                  x1={x(2_147_483_648)}
                  y1={y - 14}
                  x2={x(2_147_483_648)}
                  y2={y + 14}
                />
                <text
                  className="viz-mvcc__xiddanger"
                  x={x(2_147_483_648) - 6}
                  y={y + 64}
                  textAnchor="end"
                >
                  ~3M IDs left → Postgres refuses new XIDs (writes fail)
                </text>
              </>
            ) : null}
            <text className="viz-mvcc__xidtick" x={L} y={140}>
              0
            </text>
            <text className="viz-mvcc__xidtick" x={W - R} y={140} textAnchor="end">
              2³² ≈ 4.3 B (wraps to 0)
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function describe(model: MvccModel, subject: string): string {
  if (model.view === "page") {
    const n = model.tuples?.length ?? 0;
    return `${subject}: heap page with ${n} slot${n === 1 ? "" : "s"}`;
  }
  if (model.view === "pages") {
    const c = model.cells;
    return `${subject}: ${model.table ?? "table"} · ${c?.live ?? 0} live, ${c?.pinned ?? 0} pinned`;
  }
  return `${subject}: transaction IDs at ${formatXid(model.now ?? 0)}`;
}

export function MvccShape({ model, subject }: { model: MvccModel; subject: string }) {
  return (
    <div className="viz-mvcc" aria-label={describe(model, subject)}>
      <TxnStrip txns={model.txns} />
      {model.view === "page" ? <PageView model={model} /> : null}
      {model.view === "pages" ? <PagesView model={model} /> : null}
      {model.view === "xid" ? <XidView model={model} /> : null}
    </div>
  );
}
