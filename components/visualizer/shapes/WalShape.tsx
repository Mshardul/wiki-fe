import type { ReactNode } from "react";
import type { WalMachine, WalModel, WalPage, WalRecord } from "@/lib/visualizer/core/shapes";

function isCommitKey(k: string): boolean {
  return k === "COMMIT" || /COMMIT/.test(k);
}

function withStateMods(base: string, st: string): string {
  const parts = [base];
  for (const token of st.split(/\s+/).filter(Boolean)) {
    parts.push(`${base}--${token}`);
  }
  return parts.join(" ");
}

function recordClass(r: WalRecord): string {
  let cls = withStateMods("viz-wal__rec", r.st);
  if (isCommitKey(r.k)) cls += " viz-wal__rec--commit";
  return cls;
}

function pageClass(p: WalPage): string {
  return withStateMods("viz-wal__pg", p.st);
}

function StripList<T>({
  items,
  render,
  empty,
}: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  empty: string;
}) {
  if (items.length === 0) return <span className="viz-wal__empty">{empty}</span>;
  return <>{items.map(render)}</>;
}

function MachinePanel({ m, crash }: { m: WalMachine; crash?: boolean }) {
  return (
    <div className="viz-wal__machine">
      <div className="viz-wal__mname">
        <span>{m.name}</span>
        <small>one Postgres server</small>
      </div>
      <div className={`viz-wal__tier viz-wal__tier--mem${crash ? " viz-wal__tier--lost" : ""}`}>
        <div>
          <div className="viz-wal__tlabel">Memory · shared buffers</div>
          <div className="viz-wal__strip">
            <StripList
              items={m.memP}
              empty="empty after restart"
              render={(p) => (
                <span key={`${p.id}-${p.val}`} className={pageClass(p)}>
                  <b>{p.id}</b>
                  <span>{p.val}</span>
                  {p.sub ? <small>{p.sub}</small> : null}
                </span>
              )}
            />
          </div>
        </div>
        <div>
          <div className="viz-wal__tlabel">Memory · WAL buffer</div>
          <div className="viz-wal__strip">
            <StripList
              items={m.memW}
              empty="empty"
              render={(r) => (
                <span key={r.lsn} className={recordClass(r)}>
                  {r.lsn} · {r.k}
                  {r.sub ? <small>{r.sub}</small> : null}
                </span>
              )}
            />
          </div>
        </div>
      </div>
      <div className="viz-wal__tier viz-wal__tier--disk">
        <div>
          <div className="viz-wal__tlabel">Disk · data files</div>
          <div className="viz-wal__strip">
            <StripList
              items={m.diskP}
              empty="—"
              render={(p) => (
                <span key={`${p.id}-${p.val}`} className={pageClass(p)}>
                  <b>{p.id}</b>
                  <span>{p.val}</span>
                  {p.sub ? <small>{p.sub}</small> : null}
                </span>
              )}
            />
          </div>
        </div>
        <div>
          <div className="viz-wal__tlabel">Disk · WAL (fsynced)</div>
          <div className="viz-wal__strip">
            <StripList
              items={m.diskW}
              empty="—"
              render={(r) => (
                <span key={r.lsn} className={recordClass(r)}>
                  {r.lsn} · {r.k}
                  {r.sub ? <small>{r.sub}</small> : null}
                </span>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const REPL_PRIMARY: WalMachine = {
  name: "Primary",
  memP: [{ id: "orders", val: "new row", st: "dirty" }],
  memW: [],
  diskW: [
    { lsn: "0/1A0", k: "INSERT", st: "" },
    { lsn: "0/1C8", k: "COMMIT", st: "commit" },
  ],
  diskP: [{ id: "orders", val: "not yet", st: "stale" }],
};

function ReplicaPanel({ r }: { r: NonNullable<WalModel["repl"]> }) {
  const names = ["WAL received & written", "WAL flushed (fsync)", "WAL replayed · row visible"];
  return (
    <div className="viz-wal__machines viz-wal__machines--two">
      <MachinePanel m={REPL_PRIMARY} />
      <div className="viz-wal__machine">
        <div className="viz-wal__mname">
          <span>Replica</span>
          <small>{r.down ? "unreachable" : "streaming"}</small>
        </div>
        <div className="viz-wal__tlabel">synchronous_commit = {r.level}</div>
        <div className="viz-wal__pipe" style={r.down ? { opacity: 0.4 } : undefined}>
          {names.map((n, i) => (
            <div
              key={n}
              className={`viz-wal__stage-row${r.stages[i] ? " viz-wal__stage-row--done" : ""}`}
            >
              <span className="viz-wal__tick">{r.stages[i] ? "✓" : "·"}</span>
              <span>{n}</span>
              {r.ack === i ? <span className="viz-wal__ack">primary acks here</span> : null}
            </div>
          ))}
        </div>
        {r.ack < 0 ? (
          <div className="viz-wal__stage-row">
            <span className="viz-wal__tick" />
            <span>primary acks after its own flush, before any of this</span>
          </div>
        ) : null}
        <div className={`viz-wal__readres${r.read ? " viz-wal__readres--ok" : ""}`}>
          SELECT … on replica → {r.read ? "1 row" : "0 rows"}
        </div>
      </div>
    </div>
  );
}

function ClientStrip({ clients }: { clients: WalModel["clients"] }) {
  return (
    <div className="viz-wal__clients">
      <span className="viz-wal__txlabel">Clients</span>
      {clients.length === 0 ? (
        <span className="viz-wal__tx">none connected</span>
      ) : (
        clients.map((c) => (
          <span key={c.t} className={`viz-wal__tx${c.st ? ` viz-wal__tx--${c.st}` : ""}`}>
            {c.t}
          </span>
        ))
      )}
    </div>
  );
}

export function WalShape({ model, subject }: { model: WalModel; subject: string }) {
  const aria = model.repl
    ? `${subject}: replication · ${model.repl.level}`
    : `${subject}: ${model.machine?.name ?? "server"}`;
  return (
    <div className="viz-wal" aria-label={aria}>
      <span
        className={`viz-wal__badge${model.bad ? " viz-wal__badge--bad" : " viz-wal__badge--good"}`}
      >
        {model.badge}
      </span>
      <ClientStrip clients={model.clients} />
      {model.repl ? (
        <ReplicaPanel r={model.repl} />
      ) : model.machine ? (
        <div className="viz-wal__machines">
          <MachinePanel m={model.machine} crash={model.crash} />
        </div>
      ) : null}
    </div>
  );
}
