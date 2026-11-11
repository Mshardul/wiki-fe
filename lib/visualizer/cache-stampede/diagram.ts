import type { HotMode, StampedeFrame, StampedeView } from "./types";

const esc = (x: string) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const C = {
  hit: "var(--viz-good)",
  miss: "var(--viz-bad)",
  ref: "var(--viz-bad)",
  wait: "var(--viz-exit)",
  stale: "var(--text-muted)",
};

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T0 = -1600;
const T1 = 1200;
const BK = 50;

function hot(mode: HotMode, d: number) {
  const cls: string[] = [];
  const q: [number, number][] = [];
  let band: { a: number; b: number; st: string; t: string }[];
  if (mode === "xfetch") {
    const r = rng(7);
    let first: number | null = null;
    let done: number | null = null;
    for (let m = T0; m < T1; m++) {
      if (done !== null && m >= done) {
        cls.push("hit");
        continue;
      }
      if (m >= 0) {
        cls.push("miss");
        q.push([m, m + d]);
        continue;
      }
      if (r() <= Math.exp(m / d)) {
        cls.push("ref");
        q.push([m, m + d]);
        if (first === null) first = m;
        done = done === null ? m + d : Math.min(done, m + d);
      } else cls.push("hit");
    }
    band = [
      { a: T0, b: first!, st: "fresh", t: "fresh" },
      { a: first!, b: done!, st: "reb", t: "refreshing early" },
      { a: done!, b: T1, st: "fresh", t: "fresh again · new TTL" },
    ];
    return { cls, q, band, first, done, writes: q.length };
  }
  for (let m = T0; m < T1; m++) {
    if (m < 0) {
      cls.push("hit");
      continue;
    }
    if (m >= d) {
      cls.push("hit");
      continue;
    }
    if (mode === "none") {
      cls.push("miss");
      q.push([m, m + d]);
    } else if (mode === "lock") {
      if (m === 0) {
        cls.push("miss");
        q.push([0, d]);
      } else cls.push("wait");
    } else if (mode === "swr") {
      cls.push("stale");
      if (m === 0) q.push([0, d]);
    }
  }
  const mid: Record<string, [string, string]> = {
    none: ["gone", "expired · every request misses"],
    lock: ["reb", "rebuilding · one request holds the lock"],
    swr: ["stalek", "logically expired · serving old value, one refresh running"],
  };
  band = [
    { a: T0, b: 0, st: "fresh", t: "fresh" },
    { a: 0, b: d, st: mid[mode]![0], t: mid[mode]![1] },
    { a: d, b: T1, st: "fresh", t: "fresh · refilled" },
  ];
  return { cls, q, band, writes: q.length };
}

function svgHot(f: StampedeFrame) {
  const raw = f.mode ?? "none";
  const mode: HotMode = raw === "fixed" || raw === "jit" ? "none" : raw;
  const d = f.d ?? 200;
  const to = f.to;
  const M = hot(mode, d);
  const X0 = 118;
  const X1 = 866;
  const W = X1 - X0;
  const xs = (t: number) => X0 + ((t - T0) / (T1 - T0)) * W;
  const Y = {
    kb: [22, 48] as const,
    rq: [78, 158] as const,
    db: [192, 312] as const,
  };
  const DBMAX = 600;
  let s = `<svg viewBox="0 0 900 350" role="presentation">`;
  const lab = (y: number, a: string, b: string) =>
    `<text x="10" y="${y}" font-size="12" font-weight="600" fill="var(--text)">${a}</text><text x="10" y="${y + 15}" font-size="10.5" fill="var(--text-muted)" font-family="var(--font-mono)">${b}</text>`;
  s +=
    lab(34, "Key state", "product:42") +
    lab(112, "Requests", "per 50 ms") +
    lab(240, "Database", "queries running");
  for (let t = T0; t <= T1; t += 400) {
    const x = xs(t);
    s += `<line x1="${x}" x2="${x}" y1="18" y2="316" stroke="var(--border)" stroke-width="1"/><text x="${x}" y="334" font-size="10.5" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)">${(300 + t / 1000).toFixed(1)} s</text>`;
  }
  const bandFill: Record<string, string> = {
    fresh: "var(--viz-good-bg)",
    gone: "color-mix(in srgb, var(--viz-bad) 18%, var(--surface))",
    reb: "color-mix(in srgb, var(--viz-exit) 28%, var(--surface))",
    stalek: "color-mix(in srgb, var(--text-muted) 26%, var(--surface))",
  };
  const bandStroke: Record<string, string> = {
    fresh: "var(--viz-good)",
    gone: "var(--viz-bad)",
    reb: "var(--viz-exit)",
    stalek: "var(--text-muted)",
  };
  for (const b of M.band) {
    if (b.a >= to) continue;
    const a = xs(b.a);
    const e = xs(Math.min(b.b, to));
    if (e - a < 0.5) continue;
    s += `<rect x="${a}" y="${Y.kb[0]}" width="${e - a}" height="${Y.kb[1] - Y.kb[0]}" fill="${bandFill[b.st] ?? "var(--surface)"}" stroke="${bandStroke[b.st] ?? "var(--border)"}" stroke-width="1"/>`;
    const w = e - a;
    if (w > 40) {
      const txt = w > 230 ? b.t : w > 80 ? b.t.split(" · ")[0] : "";
      if (txt)
        s += `<text x="${a + 6}" y="${Y.kb[0] + 17}" font-size="11" fill="var(--text)" font-family="var(--font-mono)">${esc(txt)}</text>`;
    }
  }
  const order = ["hit", "stale", "wait", "ref", "miss"];
  for (let b0 = T0; b0 < T1; b0 += BK) {
    if (b0 >= to) break;
    const cnt: Record<string, number> = {};
    for (let m = b0; m < b0 + BK && m < to; m++) {
      const c = M.cls[m - T0]!;
      cnt[c] = (cnt[c] || 0) + 1;
    }
    let y = Y.rq[1];
    const bx = xs(b0) + 0.6;
    const bw = xs(b0 + BK) - xs(b0) - 1.2;
    for (const k of order) {
      const n = cnt[k] || 0;
      if (!n) continue;
      const h = (n / BK) * (Y.rq[1] - Y.rq[0]);
      y -= h;
      s += `<rect x="${bx}" y="${y}" width="${bw}" height="${h}" fill="${C[k as keyof typeof C]}"/>`;
    }
  }
  const lim = Math.min(to, T1);
  const diff = new Array(T1 - T0 + 2).fill(0);
  for (const [a, e] of M.q) {
    if (a >= lim) continue;
    diff[a - T0]!++;
    diff[Math.min(e, T1) - T0]!--;
  }
  const cc: number[] = [];
  let run = 0;
  let peak = 0;
  for (let t = T0; t <= T1; t++) {
    run += diff[t - T0]!;
    cc.push(t < lim ? run : 0);
    if (t < lim) peak = Math.max(peak, run);
  }
  const pts: [number, number][] = [];
  for (let t = T0; t <= lim; t += 10) {
    const n = cc[Math.min(t, lim - 1) - T0] || 0;
    pts.push([xs(t), Y.db[1] - (Math.min(n, DBMAX) / DBMAX) * (Y.db[1] - Y.db[0])]);
  }
  if (pts.length > 1) {
    let p = `M${pts[0]![0]},${Y.db[1]}`;
    for (const [x, y] of pts) p += ` L${x},${y}`;
    p += ` L${pts[pts.length - 1]![0]},${Y.db[1]} Z`;
    s += `<path d="${p}" fill="color-mix(in srgb, var(--viz-active) 35%, transparent)" stroke="var(--viz-active)" stroke-width="1.6"/>`;
  }
  s += `<line x1="${X0}" x2="${X1}" y1="${Y.db[1]}" y2="${Y.db[1]}" stroke="var(--text-muted)" stroke-width="1"/>`;
  const cy = Y.db[1] - (50 / DBMAX) * (Y.db[1] - Y.db[0]);
  s += `<line x1="${X0}" x2="${X1}" y1="${cy}" y2="${cy}" stroke="var(--viz-bad)" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${X1 - 4}" y="${cy - 4}" font-size="10.5" text-anchor="end" fill="var(--viz-bad)" font-family="var(--font-mono)">capacity ≈ 50</text>`;
  for (const v of [200, 400, 600]) {
    const y = Y.db[1] - (v / DBMAX) * (Y.db[1] - Y.db[0]);
    s += `<text x="${X0 - 6}" y="${y + 4}" font-size="10" text-anchor="end" fill="var(--text-muted)" font-family="var(--font-mono)">${v}</text>`;
  }
  if (peak > 0 && peak <= 5 && M.q[0]) {
    const x = xs(M.q[0][0]);
    s += `<line x1="${x}" x2="${x}" y1="${Y.db[1] - 2}" y2="${Y.db[1] - 34}" stroke="var(--viz-active)" stroke-width="1.2"/><text x="${x + 5}" y="${Y.db[1] - 26}" font-size="11" fill="var(--viz-active)" font-family="var(--font-mono)" font-weight="500">peak ${peak}</text>`;
  }
  const ex = xs(0);
  s += `<line x1="${ex}" x2="${ex}" y1="14" y2="316" stroke="var(--text)" stroke-width="1.2" stroke-dasharray="3 3"/><text x="${ex + 4}" y="13" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">${mode === "xfetch" ? "old TTL end, never reached" : "TTL ends"}</text>`;
  if (to < T1) {
    const nx = xs(to);
    s += `<line x1="${nx}" x2="${nx}" y1="18" y2="316" stroke="var(--viz-exit)" stroke-width="2"/><text x="${nx + 4}" y="${Y.rq[0] - 6}" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">now</text>`;
  }
  s += "</svg>";
  const seen = M.cls.slice(0, Math.max(0, to - T0));
  const ct = (k: string) => seen.filter((c) => c === k).length;
  const dbq = M.q.filter(([a]) => a < to).length;
  const parts = [
    `<span>requests <b>${seen.length.toLocaleString("en-US")}</b></span>`,
    `<span>hits <b>${ct("hit").toLocaleString("en-US")}</b></span>`,
  ];
  if (ct("miss")) parts.push(`<span>misses <b>${ct("miss")}</b></span>`);
  if (ct("ref")) parts.push(`<span>early recomputes <b>${ct("ref")}</b></span>`);
  if (ct("wait")) parts.push(`<span>waited <b>${ct("wait")}</b></span>`);
  if (ct("stale")) parts.push(`<span>served stale <b>${ct("stale")}</b></span>`);
  parts.push(
    `<span>database queries <b>${dbq}</b></span>`,
    `<span>most at once <b>${peak}</b></span>`,
  );
  return { svg: s, sum: parts.join("") };
}

const SYNC = (() => {
  const r = rng(42);
  const N = 1000;
  const END = 700;
  const BIN = 5;
  const nb = END / BIN;
  const fixed: number[] = Array.from({ length: nb }, () => 0);
  const jit: number[] = Array.from({ length: nb }, () => 0);
  const add = (a: number[], t: number) => {
    if (t < END) a[Math.floor(t / BIN)]!++;
  };
  for (let i = 0; i < N; i++) {
    const w = r() * 5;
    add(fixed, w);
    add(jit, w);
    for (let t = w + 300; t < END; t += 300) add(fixed, t);
    for (let t = w + 270 + r() * 60; t < END; t += 270 + r() * 60) add(jit, t);
  }
  return { fixed: fixed.map((n) => n / BIN), jit: jit.map((n) => n / BIN), BIN, END, nb };
})();

function svgSync(f: StampedeFrame) {
  const { BIN, END, nb } = SYNC;
  const mode = f.mode ?? "fixed";
  const data = mode === "jit" ? SYNC.jit : SYNC.fixed;
  const to = f.to;
  const X0 = 58;
  const X1 = 884;
  const W = X1 - X0;
  const xs = (t: number) => X0 + (t / END) * W;
  const YT = 24;
  const YB = 262;
  const YMAX = 220;
  const ys = (v: number) => YB - (Math.min(v, YMAX) / YMAX) * (YB - YT);
  let s = `<svg viewBox="0 0 900 300" role="presentation">`;
  for (const v of [0, 50, 100, 150, 200]) {
    const y = ys(v);
    s += `<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}" stroke="var(--border)"/><text x="${X0 - 6}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="var(--text-muted)" font-family="var(--font-mono)">${v}</text>`;
  }
  s += `<text x="${X0}" y="14" font-size="11" fill="var(--text-muted)" font-family="var(--font-mono)">database queries per second (5 s bins)</text>`;
  for (let t = 0; t <= END; t += 100) {
    const x = xs(t);
    s += `<text x="${x}" y="282" font-size="10.5" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)">${t} s</text>`;
  }
  for (const t of [300, 600]) {
    const x = xs(t);
    s += `<line x1="${x}" x2="${x}" y1="${YT}" y2="${YB}" stroke="var(--text)" stroke-width="1" stroke-dasharray="3 3"/><text x="${x + 4}" y="${YT + 10}" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">${t / 300}× TTL</text>`;
  }
  const bw = W / nb;
  if (mode === "jit") {
    for (let i = 0; i < nb; i++) {
      const v = SYNC.fixed[i]!;
      if (!v) continue;
      s += `<rect x="${xs(i * BIN) + 0.4}" y="${ys(v)}" width="${bw - 0.8}" height="${YB - ys(v)}" fill="none" stroke="var(--viz-bad)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    }
  }
  let peakAfter = 0;
  let inWin = 0;
  for (let i = 0; i < nb; i++) {
    const t = i * BIN;
    if (t >= to) break;
    const v = data[i]!;
    if (t >= 10) peakAfter = Math.max(peakAfter, v);
    inWin += v * BIN;
    if (!v) continue;
    const fill =
      t < 10 ? "var(--viz-active)" : mode === "jit" ? "var(--viz-good)" : "var(--viz-bad)";
    s += `<rect x="${xs(t) + 0.4}" y="${ys(v)}" width="${bw - 0.8}" height="${YB - ys(v)}" fill="${fill}"/>`;
  }
  s += `<line x1="${X0}" x2="${X1}" y1="${YB}" y2="${YB}" stroke="var(--text-muted)"/>`;
  if (to < END) {
    const nx = xs(to);
    s += `<line x1="${nx}" x2="${nx}" y1="${YT}" y2="${YB}" stroke="var(--viz-exit)" stroke-width="2"/><text x="${nx + 4}" y="${YB - 6}" font-size="10.5" fill="var(--text)" font-family="var(--font-mono)">now</text>`;
  }
  s += "</svg>";
  const sum = `<span>TTL <b>${mode === "jit" ? "300 ± 30 s" : "300 s fixed"}</b></span><span>keys <b>1,000</b></span><span>queries so far <b>${Math.round(inWin).toLocaleString("en-US")}</b></span><span>highest rate after warm-up <b>${peakAfter ? `${Math.round(peakAfter)}/s` : "none yet"}</b></span><span>average needed <b>≈ 3/s</b></span>`;
  return { svg: s, sum };
}

const HREQ = [0, 12, 40, 75, 110, 150, 190, 230, 260, 290, 305, 330, 370, 420, 470, 520, 560, 600];

function svgHappy(f: StampedeFrame) {
  const on = new Set(f.arrows ?? []);
  const to = f.to;
  let s = `<svg viewBox="0 0 900 330" role="presentation">`;
  const box = (x: number, y: number, w: number, h: number, t: string, sub: string, act: boolean) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="var(--surface)" stroke="${act ? "var(--viz-exit)" : "var(--border)"}" stroke-width="${act ? 2.5 : 1.5}"/><text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" font-size="13.5" font-weight="600" fill="var(--text)">${t}</text><text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" font-size="10.5" fill="var(--text-muted)" font-family="var(--font-mono)">${sub}</text>`;
  const arr = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    k: string,
    col: string,
    ly: number,
  ) => {
    const a = on.has(k);
    const c = a ? col : "var(--border)";
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${a ? 2.5 : 1.5}" marker-end="url(#ah${a ? k : "off"})"/><text x="${(x1 + x2) / 2}" y="${ly}" text-anchor="middle" font-size="11" fill="${a ? "var(--text)" : "var(--text-muted)"}" font-family="var(--font-mono)" font-weight="${a ? 500 : 400}">${label}</text>`;
  };
  const keys = ["get", "hit", "miss", "select", "rows", "set", "off"];
  const cols: Record<string, string> = {
    get: "var(--viz-active)",
    hit: "var(--viz-good)",
    miss: "var(--viz-bad)",
    select: "var(--viz-active)",
    rows: "var(--viz-active)",
    set: "var(--viz-active)",
    off: "var(--border)",
  };
  s +=
    "<defs>" +
    keys
      .map(
        (k) =>
          `<marker id="ah${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${cols[k]}"/></marker>`,
      )
      .join("") +
    "</defs>";
  s +=
    box(40, 70, 170, 64, "App server", "get_product(42)", on.size > 0) +
    box(650, 10, 210, 64, "Redis", "product:42 · TTL 300 s", on.has("get") || on.has("set")) +
    box(650, 128, 180, 64, "Database", "SELECT … ~200 ms", on.has("select"));
  s +=
    arr(212, 84, 648, 34, "① GET product:42", "get", "var(--viz-active)", 48) +
    arr(
      648,
      52,
      212,
      98,
      on.has("miss") ? "② nil (miss)" : "② value (hit)",
      on.has("miss") ? "miss" : "hit",
      on.has("miss") ? "var(--viz-bad)" : "var(--viz-good)",
      86,
    ) +
    arr(212, 112, 648, 148, "③ SELECT … WHERE id = 42", "select", "var(--viz-active)", 122) +
    arr(648, 174, 212, 128, "④ row", "rows", "var(--viz-active)", 168);
  if (on.has("set")) {
    s += `<path d="M130,136 C130,222 600,218 760,214 C880,211 892,150 892,60 Q892,42 864,42" fill="none" stroke="var(--viz-active)" stroke-width="2.5" marker-end="url(#ahset)"/><text x="470" y="236" text-anchor="middle" font-size="11" fill="var(--text)" font-family="var(--font-mono)" font-weight="500">⑤ SET product:42 … EX 300</text>`;
  }
  const X0 = 118;
  const X1 = 884;
  const END = 620;
  const xs = (t: number) => X0 + (t / END) * (X1 - X0);
  const Y0 = 262;
  const Y1 = 286;
  s += `<text x="10" y="276" font-size="12" font-weight="600" fill="var(--text)">Key state</text><text x="10" y="291" font-size="10.5" fill="var(--text-muted)" font-family="var(--font-mono)">0–620 s</text>`;
  const segs: [number, number, string][] = [
    [0, 300, "fresh"],
    [300, 305, "gone"],
    [305, END, "fresh"],
  ];
  for (const [a, b, st] of segs) {
    if (a >= to) continue;
    const e = Math.min(b, to);
    s += `<rect x="${xs(a)}" y="${Y0}" width="${Math.max(1.5, xs(e) - xs(a))}" height="${Y1 - Y0}" fill="${st === "fresh" ? "var(--viz-good-bg)" : "color-mix(in srgb, var(--viz-bad) 25%, var(--surface))"}" stroke="${st === "fresh" ? "var(--viz-good)" : "var(--viz-bad)"}"/>`;
  }
  for (const t of HREQ) {
    if (t > to) continue;
    const miss = t === 0 || t === 305;
    s += `<circle cx="${xs(t)}" cy="${Y0 - 10}" r="${miss ? 5 : 4}" fill="${miss ? "var(--viz-bad)" : "var(--viz-good)"}"/>`;
  }
  for (let t = 0; t <= 600; t += 100) {
    s += `<text x="${xs(t)}" y="306" font-size="10.5" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)">${t} s</text>`;
  }
  if (to >= 300) {
    const x = xs(300);
    s += `<text x="${x}" y="322" font-size="10.5" text-anchor="middle" fill="var(--viz-bad)" font-family="var(--font-mono)">TTL ends · next request at 305 s misses</text>`;
  }
  s += "</svg>";
  const seen = HREQ.filter((t) => t <= to);
  const miss = seen.filter((t) => t === 0 || t === 305).length;
  return {
    svg: s,
    sum: `<span>requests <b>${seen.length}</b></span><span>hits <b>${seen.length - miss}</b></span><span>misses <b>${miss}</b></span><span>database queries <b>${miss}</b></span>`,
  };
}

export function stampedeDiagram(view: StampedeView, frame: StampedeFrame) {
  if (view === "hot") return svgHot(frame);
  if (view === "sync") return svgSync(frame);
  return svgHappy(frame);
}

export const STAMPEDE_LEGEND: Record<
  StampedeView,
  { swatch: string; label: string; stroke?: string }[]
> = {
  happy: [
    { swatch: "var(--viz-good)", label: "Hit (request dot)" },
    { swatch: "var(--viz-bad)", label: "Miss: goes to the database" },
    { swatch: "var(--viz-good-bg)", label: "Key fresh", stroke: "var(--viz-good)" },
    {
      swatch: "color-mix(in srgb, var(--viz-bad) 25%, var(--surface))",
      label: "Key expired",
      stroke: "var(--viz-bad)",
    },
  ],
  hot: [
    { swatch: "var(--viz-good)", label: "Hit" },
    { swatch: "var(--viz-bad)", label: "Miss or recompute: queries the database" },
    { swatch: "var(--viz-exit)", label: "Waited for another request's rebuild" },
    { swatch: "var(--text-muted)", label: "Served the old value" },
    {
      swatch: "color-mix(in srgb, var(--viz-active) 35%, transparent)",
      label: "Database queries running",
      stroke: "var(--viz-active)",
    },
  ],
  sync: [
    { swatch: "var(--viz-active)", label: "Warm-up job loading keys" },
    { swatch: "var(--viz-bad)", label: "Refills, fixed TTL" },
    { swatch: "var(--viz-good)", label: "Refills, jittered TTL" },
    { swatch: "transparent", label: "Fixed-TTL bars, for comparison", stroke: "var(--viz-bad)" },
  ],
};
