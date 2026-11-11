import type { DnsBoxRow, DnsCachingModel } from "@/lib/visualizer/core/shapes";
import { DnsChainDiagram } from "./DnsChainDiagram";

function fmt(v: number): string {
  return v >= 1000 ? v.toLocaleString("en-US") : String(Math.round(v * 10) / 10);
}

function boxSummary(b: DnsBoxRow): string {
  const c = b.card;
  if (!c) return b.note ?? "—";
  if (c.max != null) {
    return `${c.l2} · ${(c.left ?? 0) <= 0 ? "expired" : `${fmt(c.left ?? 0)} ${c.unit ?? "s"} left`}`;
  }
  return `${c.l2}${c.tag ? ` · ${c.tag}` : ""}`;
}

function clockLabel(clock: string): string {
  return /^[\d+]/.test(clock) ? `t = ${clock}` : clock;
}

export function DnsCachingShape({ model }: { model: DnsCachingModel; subject: string }) {
  return (
    <div className="viz-dns" role="img" aria-label="DNS caching chain">
      <div className="viz-dns__meta">
        <span className="viz-dns__clock">{clockLabel(model.clock)}</span>
        {model.badge ? (
          <span className={`viz-dns__badge${model.badgeBad ? " viz-dns__badge--bad" : ""}`}>
            {model.badge}
          </span>
        ) : null}
      </div>
      {model.term ? <pre className="viz-dns__term">{model.term}</pre> : null}
      <div className="viz-dns__tlwrap">
        <DnsChainDiagram model={model} />
      </div>
      <div className="viz-dns__sum">
        {model.boxes.map((b) => (
          <span key={b.n}>
            {b.n} <b>{boxSummary(b)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
