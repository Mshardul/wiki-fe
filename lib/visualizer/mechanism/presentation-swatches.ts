import { swatchesIn } from "@/lib/visualizer/core/schedule";
import type {
  BtreePageState,
  ConnPacketKind,
  DnsCardKey,
  ResourceGaugeRow,
  ScheduleSwatch,
  ShapeModel,
} from "@/lib/visualizer/core/shapes";
import type { VizFrame } from "@/lib/visualizer/core/types";

const MVCC: Record<string, ScheduleSwatch> = {
  live: "mvcc-live",
  new: "mvcc-new",
  dead: "mvcc-dead",
  free: "mvcc-free",
};

const BTREE: Record<BtreePageState, ScheduleSwatch> = {
  read: "btree-read",
  scan: "btree-waste",
  nope: "btree-nope",
  write: "btree-read",
};

const K8S_POD: Record<string, ScheduleSwatch | undefined> = {
  creating: "k8s-creating",
  running: "k8s-running",
  ready: "k8s-ready",
  crash: "k8s-fail",
  bad: "k8s-fail",
};

const K8S_EP: Record<string, ScheduleSwatch | undefined> = {
  ready: "k8s-ep-ready",
  no: "k8s-ep-wait",
  notready: "k8s-ep-wait",
  term: "k8s-ep-term",
};

const CONN_PKT: Record<ConnPacketKind, ScheduleSwatch> = {
  tcp: "conn-tcp",
  tls: "conn-tls",
  req: "conn-req",
  ticket: "conn-ticket",
  early: "conn-early",
  bad: "conn-bad",
};

const DNS_CARD: Record<DnsCardKey, ScheduleSwatch> = {
  ok: "dns-ok",
  old: "dns-old",
  new: "dns-new",
  nx: "dns-nx",
};

function addGaugeSwatches(g: ResourceGaugeRow, out: Set<ScheduleSwatch>): void {
  const hit = g.lim != null && g.use >= g.lim;
  const over = g.req != null && g.use > g.req;
  if (g.req != null) out.add("gauge-req");
  if (g.lim != null) out.add("gauge-cap");
  if (hit) out.add("gauge-hit");
  else if (over) out.add("gauge-over");
  else out.add("gauge-in");
  if (g.thr != null) out.add("gauge-thr");
}

function walTokenSwatches(st: string, out: Set<ScheduleSwatch>): void {
  const tokens = st.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t === "commit") out.add("wal-commit");
    if (t === "fpi") out.add("wal-fpi");
    if (t === "ckpt") out.add("wal-ckpt");
    if (t === "dirty") out.add("wal-dirty");
    if (t === "step") out.add("wal-step");
  }
  out.add("wal-rec");
}

export function swatchesInPresentation(model: ShapeModel): Set<ScheduleSwatch> {
  const out = new Set<ScheduleSwatch>();

  switch (model.kind) {
    case "schedule":
    case "linear":
    case "histogram":
    case "ring":
    case "ranking":
    case "lanes":
    case "timeline":
    case "composite":
    case "cache-stampede":
    case "celery-board":
      return out;
    case "mvcc": {
      for (const t of model.tuples ?? []) {
        const s = MVCC[t.state];
        if (s) out.add(s);
      }
      if ((model.cells?.pinned ?? 0) > 0) out.add("mvcc-pinned");
      break;
    }
    case "btree": {
      for (const st of Object.values(model.st)) out.add(BTREE[st]);
      if (model.vm?.some(Boolean)) out.add("btree-vm-on");
      if (model.vm?.some((v) => !v)) out.add("btree-vm-off");
      break;
    }
    case "wal": {
      const m = model.machine;
      if (m) {
        for (const r of [...m.memW, ...m.diskW]) walTokenSwatches(r.st, out);
        for (const p of [...m.memP, ...m.diskP]) {
          if (p.st.includes("dirty")) out.add("wal-dirty");
          walTokenSwatches(p.st, out);
        }
      }
      break;
    }
    case "http-pipeline": {
      if ((model.skip?.length ?? 0) > 0) out.add("http-skip");
      if ((model.fail?.length ?? 0) > 0) out.add("http-fail");
      if (model.workers) out.add("http-worker");
      if (model.clock !== undefined) out.add("http-clock");
      out.add(model.token.res ? "http-res" : "http-req");
      break;
    }
    case "k8s-hub": {
      if (model.actors.some((a) => a.on)) out.add("k8s-act");
      for (const node of model.nodes) {
        for (const pod of node.pods) {
          const s = K8S_POD[pod.st];
          if (s) out.add(s);
        }
        if (node.bad) out.add("k8s-fail");
      }
      for (const o of model.objects) {
        if (o.st === "bad") out.add("k8s-fail");
      }
      break;
    }
    case "k8s-service": {
      for (const e of model.endpoints) {
        const s = K8S_EP[e.st];
        if (s) out.add(s);
      }
      for (const c of model.clients) {
        for (const conn of c.conns) {
          if (conn.st === "new") out.add("k8s-conn-new");
          if (conn.st === "fail" || conn.st === "rst") out.add("k8s-conn-fail");
        }
      }
      break;
    }
    case "resource-gauges": {
      for (const row of [...model.nodes, ...model.containers]) {
        for (const g of row.g) addGaugeSwatches(g, out);
      }
      break;
    }
    case "dns-caching": {
      for (const b of model.boxes) {
        if (b.card) out.add(DNS_CARD[b.card.k]);
      }
      if (model.extra?.card) out.add(DNS_CARD[model.extra.card.k]);
      for (const row of model.timeline.rows) {
        for (const seg of row.segs) out.add(DNS_CARD[seg[2]]);
      }
      break;
    }
    case "conn-ladder": {
      if (model.view === "ports") {
        if (!model.fix) out.add("conn-tw");
      } else {
        for (const m of model.msgs ?? []) out.add(CONN_PKT[m.k]);
      }
      break;
    }
    case "connection-pool": {
      const lane = model.lane;
      if (lane?.st === "active") out.add("pool-ok");
      if (lane?.st === "dropped") out.add("pool-gone");
      if (lane?.st === "fin" || lane?.st === "rst") out.add("pool-limit");
      for (const e of model.ev ?? []) {
        if (e.label?.toLowerCase().includes("request")) out.add("pool-req");
      }
      if ((model.parties ?? []).some((p) => (p.segs?.length ?? 0) > 0)) out.add("pool-idle");
      if (model.view === "pool") {
        if ((model.queue ?? 0) > 0) out.add("pool-wait");
        if ((model.busy ?? 0) > 0) out.add("pool-busy");
        const free = (model.slots ?? 0) - (model.busy ?? 0);
        if (free > 0) out.add("pool-free");
      }
      break;
    }
    default:
      break;
  }

  return out;
}

export function swatchesInFrame(frame: VizFrame): Set<ScheduleSwatch> {
  const out = new Set<ScheduleSwatch>();
  const fromSchedule = swatchesIn([frame]);
  if (fromSchedule) fromSchedule.forEach((s) => out.add(s));
  swatchesInPresentation(frame.model).forEach((s) => out.add(s));
  return out;
}
