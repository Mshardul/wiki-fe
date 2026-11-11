import { useId } from "react";
import type { BtreeModel, BtreePageState } from "@/lib/visualizer/core/shapes";

const LW = 108;
const LH = 74;
const LG = 10;
const LX0 = 11;
const LY = 188;
const IY = 104;
const IW = 230;
const IH = 40;
const RY = 22;
const RW = 220;
const RH = 40;
const HY = 318;
const HW = 78;
const HG = 8;
const HX0 = 20;
const HH = 44;

const leafX = (i: number) => LX0 + i * (LW + LG);
const intX = (k: number) => {
  const a = leafX(k * 3);
  const b = leafX(k * 3 + 2) + LW;
  return (a + b) / 2 - IW / 2;
};
const heapX = (i: number) => HX0 + i * (HW + HG);

function pageClass(state?: BtreePageState): string {
  if (state === "read") return "viz-btree__page--read";
  if (state === "scan") return "viz-btree__page--waste";
  if (state === "nope") return "viz-btree__page--nope";
  if (state === "write") return "viz-btree__page--write";
  return "viz-btree__page--idle";
}

function edgeOn(st: Record<string, BtreePageState>, from: string, to: string): boolean {
  const a = st[from];
  const b = st[to];
  return Boolean(a && b && a !== "nope" && b !== "nope");
}

export function BtreeShape({ model, subject }: { model: BtreeModel; subject: string }) {
  const arrowId = useId();
  const T = model.tree;
  const st = model.st;
  const hl = model.hl ?? {};
  const H = HY + HH + 22;
  const rx = 360 - RW / 2;
  const treeOp = model.dim ? 0.32 : 1;

  return (
    <div className="viz-btree" aria-label={`${subject}: ${T.name}`}>
      <div className="viz-btree__meta">
        <span
          className={`viz-btree__plan${model.bad ? " viz-btree__plan--bad" : " viz-btree__plan--good"}`}
        >
          {model.plan}
        </span>
        {model.count ? (
          <span className="viz-btree__counter">
            Pages read: <b>{model.count}</b>
          </span>
        ) : null}
      </div>
      <div className="viz-btree__treewrap">
        <svg viewBox={`0 0 720 ${H}`} role="img" aria-label={`B-tree index and heap: ${T.name}`}>
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX={5}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto"
            >
              <path className="viz-btree__arrowhead" d="M0,0 L10,5 L0,10 z" />
            </marker>
          </defs>
          <g opacity={treeOp}>
            <text className="viz-btree__heading" x={11} y={14}>
              INDEX {T.name}
            </text>
            {[0, 1].map((k) => {
              const rootOn = edgeOn(st, "root", `i${k}`);
              const intState = st[`i${k}`];
              return (
                <g key={`edges-${k}`}>
                  <line
                    className={rootOn ? "viz-btree__edge--on" : "viz-btree__edge"}
                    x1={360}
                    y1={RY + RH}
                    x2={intX(k) + IW / 2}
                    y2={IY}
                  />
                  {[0, 1, 2].map((j) => {
                    const i = k * 3 + j;
                    const leafState = st[`l${i}`];
                    const on2 = Boolean(intState && leafState && leafState !== "nope");
                    const waste = leafState === "scan";
                    return (
                      <line
                        key={`e-${i}`}
                        className={
                          on2
                            ? waste
                              ? "viz-btree__edge--waste"
                              : "viz-btree__edge--on"
                            : "viz-btree__edge"
                        }
                        x1={intX(k) + IW / 2}
                        y1={IY + IH}
                        x2={leafX(i) + LW / 2}
                        y2={LY}
                      />
                    );
                  })}
                </g>
              );
            })}
            <rect className={pageClass(st.root)} x={rx} y={RY} width={RW} height={RH} rx={6} />
            <text className="viz-btree__pagelabel" x={360} y={RY + 16} textAnchor="middle">
              root
            </text>
            <text className="viz-btree__pagetext" x={360} y={RY + 31} textAnchor="middle">
              {T.root}
            </text>
            {st.root === "nope" ? (
              <text className="viz-btree__nopecallout" x={rx + RW + 8} y={RY + 26}>
                which way? no key in the query
              </text>
            ) : null}
            {[0, 1].map((k) => {
              const x = intX(k);
              return (
                <g key={`int-${k}`}>
                  <rect
                    className={pageClass(st[`i${k}`])}
                    x={x}
                    y={IY}
                    width={IW}
                    height={IH}
                    rx={6}
                  />
                  <text
                    className="viz-btree__pagelabel"
                    x={x + IW / 2}
                    y={IY + 16}
                    textAnchor="middle"
                  >
                    internal
                  </text>
                  <text
                    className="viz-btree__pagetext"
                    x={x + IW / 2}
                    y={IY + 31}
                    textAnchor="middle"
                  >
                    {T.ints[k]}
                  </text>
                </g>
              );
            })}
            {T.leaves.map((ents, i) => {
              const x = leafX(i);
              const leafKey = `l${i}`;
              return (
                <g key={`leaf-${i}`}>
                  <rect
                    className={pageClass(st[leafKey])}
                    x={x}
                    y={LY}
                    width={LW}
                    height={LH}
                    rx={6}
                  />
                  <text className="viz-btree__pagelabel" x={x + 8} y={LY + 13}>
                    leaf {i + 1}
                  </text>
                  {ents.map((e, j) => {
                    const y = LY + 28 + j * 16;
                    const on = (hl[leafKey] ?? []).includes(j);
                    return (
                      <g key={`${i}-${j}`}>
                        {on ? (
                          <rect
                            className={model.hlBad ? "viz-btree__hl--bad" : "viz-btree__hl"}
                            x={x + 4}
                            y={y - 11}
                            width={LW - 8}
                            height={15}
                            rx={3}
                          />
                        ) : null}
                        <text
                          className={`viz-btree__entry${on ? " viz-btree__entry--on" : ""}`}
                          x={x + 8}
                          y={y}
                          fontSize={e.length > 14 ? 9.5 : 10.5}
                        >
                          {e}
                        </text>
                      </g>
                    );
                  })}
                  {i < 5 ? (
                    <line
                      className="viz-btree__leaflink"
                      x1={x + LW + 1}
                      y1={LY + LH / 2}
                      x2={x + LW + LG - 1}
                      y2={LY + LH / 2}
                    />
                  ) : null}
                </g>
              );
            })}
            {(model.probes ?? []).map((i, k) => {
              const x = leafX(i) + LW / 2;
              const label = model.probeLabel && k === 0 ? model.probeLabel : `probe ${k + 1}`;
              return (
                <g key={`probe-${i}-${k}`}>
                  <line
                    className="viz-btree__probe"
                    x1={x + 30}
                    y1={LY - 16}
                    x2={x + 30}
                    y2={LY - 3}
                    markerEnd={`url(#${arrowId})`}
                  />
                  <text
                    className="viz-btree__probelabel"
                    x={leafX(i) + LW - 7}
                    y={LY + 13}
                    textAnchor="end"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
          <text className="viz-btree__heading" x={HX0} y={HY - 10}>
            HEAP (table pages, rows in no particular order)
          </text>
          {(model.links ?? []).map(([l, h]) => (
            <line
              key={`link-${l}-${h}`}
              className={model.linkBad ? "viz-btree__heaplink--bad" : "viz-btree__heaplink"}
              x1={leafX(l) + LW / 2}
              y1={LY + LH}
              x2={heapX(h) + HW / 2}
              y2={HY}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const state = model.heapAll ?? st[`h${i}`];
            const x = heapX(i);
            return (
              <g key={`heap-${i}`}>
                <rect className={pageClass(state)} x={x} y={HY} width={HW} height={HH} rx={6} />
                <text className="viz-btree__heaplabel" x={x + 10} y={HY + 26}>
                  page {i + 1}
                </text>
                {state === "write" ? (
                  <text className="viz-btree__heapnote" x={x + 10} y={HY + 39}>
                    updated
                  </text>
                ) : null}
                {model.vm ? (
                  <circle
                    className={model.vm[i] ? "viz-btree__vm--on" : "viz-btree__vm--off"}
                    cx={x + HW - 12}
                    cy={HY + 12}
                    r={5}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
