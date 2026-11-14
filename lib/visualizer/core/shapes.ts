export type Axis = "vertical" | "horizontal";
export type ActiveTone = "new" | "existing";

export interface LinearModel {
  kind: "linear";
  items: string[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  removed: string | null;
  labels: { entry: string; exit: string };
  defaultAxis: Axis;
}

export interface HistogramSlot {
  key: string;
  count: number;
}
export interface HistogramModel {
  kind: "histogram";
  slots: (HistogramSlot | null)[];
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  defaultAxis: Axis;
}

export interface RankingRow {
  key: string;
  count: number;
}
// Rows arrive already ranked (rank 0 first); the last row is the next one out when the structure is full.
export interface RankingModel {
  kind: "ranking";
  rows: RankingRow[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  removed: string | null;
}

export interface RingSlot {
  key: string;
  bit: 0 | 1;
}
export interface RingModel {
  kind: "ring";
  slots: (RingSlot | null)[];
  hand: number;
  turns: number;
  cleared: number[];
  active: number | null;
  tone: ActiveTone | null;
}

export type LaneTone = "changed" | "stale" | "lost" | "muted";
export interface CardItem {
  text: string;
  tone?: LaneTone;
  bar?: { value: number; max: number };
}
export interface CardSection {
  title: string;
  layout: "rows" | "chips";
  items: CardItem[];
}
export interface Lane {
  id: string;
  name: string;
  dead?: boolean;
  sections: CardSection[];
}
export interface Hop {
  from: string;
  to: string;
  label: string;
  thread: 0 | 1;
  reply?: boolean;
  flag?: boolean;
}
// Hops are drawn top to bottom and numbered by position; slots and cardRows are run-wide so the stage keeps one height.
export interface LanesModel {
  kind: "lanes";
  lanes: Lane[];
  hops: Hop[];
  slots: number;
  cardRows: number;
  // Changes on every step, so a hop that looks like the previous step's still replays its fade-in.
  epoch?: number;
  note?: string;
}

export type TimelineTone = "good" | "bad" | "faded";
export interface TimelineMark {
  at: number;
  tone: TimelineTone;
  current?: boolean;
  // Spoken instead of the tone word, e.g. "allowed".
  title?: string;
}
export interface TimelineRow {
  label: string;
  marks: TimelineMark[];
}
export interface TimelineBand {
  from: number;
  to: number;
  label: string;
  // Shown instead of label on narrow stages.
  short?: string;
}
export type SpanStyle = "outline" | "fill" | "hatch" | "alert";
export interface TimelineSpan {
  from: number;
  to: number;
  label: string;
  short?: string;
  style: SpanStyle;
}
// stack and lanes are run-wide maxima (tallest pile of simultaneous marks, most labelled spans) so the stage keeps one height.
export interface TimelineModel {
  kind: "timeline";
  ticks: number;
  now: number;
  stack: number;
  lanes: number;
  rows: TimelineRow[];
  bands: TimelineBand[];
  spans: TimelineSpan[];
  boundaries: number[];
}

export type ScheduleStyle = "solid" | "hatch" | "outline" | "thread";
export type ScheduleSwatch =
  | ScheduleStyle
  | "meter"
  | "arrow"
  | "pin"
  | "mvcc-live"
  | "mvcc-new"
  | "mvcc-dead"
  | "mvcc-pinned"
  | "mvcc-free"
  | "btree-read"
  | "btree-waste"
  | "btree-nope"
  | "btree-vm-on"
  | "btree-vm-off"
  | "wal-rec"
  | "wal-commit"
  | "wal-fpi"
  | "wal-ckpt"
  | "wal-dirty"
  | "wal-step"
  | "http-req"
  | "http-res"
  | "http-skip"
  | "http-fail"
  | "http-clock"
  | "http-worker"
  | "k8s-act"
  | "k8s-creating"
  | "k8s-running"
  | "k8s-ready"
  | "k8s-fail"
  | "k8s-ep-ready"
  | "k8s-ep-wait"
  | "k8s-ep-term"
  | "k8s-conn-new"
  | "k8s-conn-fail"
  | "gauge-in"
  | "gauge-over"
  | "gauge-hit"
  | "gauge-req"
  | "gauge-cap"
  | "gauge-thr"
  | "dns-ok"
  | "dns-old"
  | "dns-new"
  | "dns-nx"
  | "conn-tcp"
  | "conn-tls"
  | "conn-req"
  | "conn-ticket"
  | "conn-early"
  | "conn-bad"
  | "conn-tw"
  | "pool-idle"
  | "pool-limit"
  | "pool-gone"
  | "pool-req"
  | "pool-ok"
  | "pool-busy"
  | "pool-free"
  | "pool-wait";

export interface K8sHubActorRow {
  id: string;
  name: string;
  watch: string;
  on?: { saw: string; wrote: string };
}

export interface K8sHubObjectRow {
  k: string;
  n: string;
  f: string;
  st?: string;
}

export interface K8sHubPodRow {
  n: string;
  img: string;
  st: string;
  ip?: string;
  nw?: boolean;
  r?: number;
}

export interface K8sHubNodeRow {
  n: string;
  cap?: string;
  bad?: boolean;
  pods: K8sHubPodRow[];
}

export interface K8sHubKubeletRow {
  saw: string;
  wrote: string;
}

export interface K8sHubModel {
  kind: "k8s-hub";
  actors: K8sHubActorRow[];
  apiOn: boolean;
  objects: K8sHubObjectRow[];
  nodes: K8sHubNodeRow[];
  kubelets: Record<string, K8sHubKubeletRow | undefined>;
  term?: string;
  badge: string;
  badgeBad?: boolean;
}

export interface K8sServiceEndpointRow {
  ip: string;
  pod: string;
  st: string;
}

export interface K8sServiceConnRow {
  to: string;
  st: string;
  label: string;
}

export interface K8sServiceClientRow {
  n: string;
  node: string;
  note?: string;
  conns: K8sServiceConnRow[];
  on?: boolean;
}

export interface K8sServiceRuleRow {
  t: string[];
  st: string;
  note?: string;
  gone?: string[];
  on?: boolean;
}

export interface K8sServiceBackendRow {
  n: string;
  ip: string;
  node: string;
  st: string;
  note?: string;
  conns?: number;
  load?: number;
  on?: boolean;
}

export interface K8sServiceModel {
  kind: "k8s-service";
  badge: string;
  badgeBad?: boolean;
  endpointsOn?: boolean;
  endpoints: K8sServiceEndpointRow[];
  clients: K8sServiceClientRow[];
  rules: Record<string, K8sServiceRuleRow>;
  backends: K8sServiceBackendRow[];
}

export type ResourceGaugeKind = "cpu" | "mem";

export interface ResourceGaugeRow {
  kind: ResourceGaugeKind;
  label: string;
  use: number;
  req: number | null;
  lim: number | null;
  max?: number;
  add?: number;
  plain?: boolean;
  thr?: number;
  thrLabel?: string;
}

export interface ResourceCardRow {
  n: string;
  sub?: string;
  pod?: string;
  qos?: string;
  g: ResourceGaugeRow[];
  note?: string;
  st?: string;
  bad?: boolean;
  restarts?: number;
  status?: string;
  on?: boolean;
}

export interface CpuTimelineLaneRow {
  n: string;
  segs: [number, number, "run" | "thr"][];
}

export interface CpuTimelineModel {
  lanes: CpuTimelineLaneRow[];
  marks?: { t: number; l: string }[];
}

export interface ResourceGaugesModel {
  kind: "resource-gauges";
  badge: string;
  badgeBad?: boolean;
  term?: string;
  nodesTitle?: string;
  nodes: ResourceCardRow[];
  containers: ResourceCardRow[];
  timeline?: CpuTimelineModel;
  sum: string[];
}

export type DnsCardKey = "old" | "new" | "nx" | "ok";

export interface DnsCacheCard {
  k: DnsCardKey;
  l1: string;
  l2: string;
  left?: number;
  max?: number;
  unit?: string;
  tag?: string;
}

export interface DnsBoxRow {
  n: string;
  sub?: string;
  hl?: boolean;
  note?: string;
  note2?: string;
  note2c?: string;
  card?: DnsCacheCard;
}

export interface DnsTimelineRow {
  label: string;
  segs: [number, number, DnsCardKey, string?][];
}

export interface DnsTrafficTimeline {
  axis: [number, number];
  ticks: [number, string][];
  rows: DnsTimelineRow[];
  now: number;
  marks?: [number, string, string?][];
  title?: string;
}

export interface DnsExtraPanel {
  under: number;
  n: string;
  card: DnsCacheCard;
}

export interface DnsCachingModel {
  kind: "dns-caching";
  clock: string;
  badge: string;
  badgeBad?: boolean;
  term?: string;
  boxes: DnsBoxRow[];
  req?: [number, number, string, string?][];
  answerArrows?: [number, number, string, string?][];
  extra?: DnsExtraPanel;
  timeline: DnsTrafficTimeline;
}

export type ConnPacketKind = "tcp" | "tls" | "req" | "ticket" | "early" | "bad";

export interface ConnLadderMsg {
  a: number;
  b: number;
  t0: number;
  t1: number;
  k: ConnPacketKind;
  label?: string;
  w?: number;
  dash?: boolean;
  lp?: number;
}

export interface ConnPhase {
  t0: number;
  t1: number;
  label: string;
  c: ConnPacketKind;
}

export interface ConnLane {
  n: string;
  x: number;
  dash?: boolean;
  bad?: boolean;
}

export interface ConnMark {
  lane: number;
  t: number;
  label: string;
  left?: boolean;
  col?: string;
}

export type ConnCostView = "ladder" | "ports";

export interface ConnLadderModel {
  kind: "conn-ladder";
  view: ConnCostView;
  clock: string;
  badge: string;
  badgeBad?: boolean;
  term?: string;
  lanes?: ConnLane[];
  msgs?: ConnLadderMsg[];
  phases?: ConnPhase[];
  tmax?: number;
  now?: number;
  rtt?: number | null;
  marks?: ConnMark[];
  t?: number;
  fix?: boolean;
  why?: boolean;
}

export type ConnPoolView = "lanes" | "fleet" | "pool";

export interface ConnPoolParty {
  name: string;
  view?: string;
  limitTxt?: string;
  pass?: boolean;
  bad?: boolean;
  segs?: [number, number, string?][];
  limit?: number;
  limitLab?: string;
  labLeft?: boolean;
  offTxt?: string;
}

export interface ConnPoolLaneArrow {
  from: number;
  to: number;
  label: string;
  y?: number;
  col?: string;
}

export interface ConnPoolLane {
  st?: string;
  note?: string;
  arrows?: ConnPoolLaneArrow[];
}

export interface ConnPoolEvent {
  t: number;
  label?: string;
  col?: string;
  left?: boolean;
}

export interface ConnectionPoolModel {
  kind: "connection-pool";
  view: ConnPoolView;
  clock: string;
  badge: string;
  badgeBad?: boolean;
  term?: string;
  axis?: [number, number, number[]];
  now?: number;
  parties?: ConnPoolParty[];
  lane?: ConnPoolLane;
  ev?: ConnPoolEvent[];
  slots?: number;
  busy?: number;
  need?: string;
  queue?: number;
  fix?: boolean;
}

export type StampedeView = "happy" | "hot" | "sync";

export interface CacheStampedeModel {
  kind: "cache-stampede";
  view: StampedeView;
  clock: string;
  badge: string;
  badgeBad?: boolean;
  term?: string;
  diagramSvg: string;
  summaryHtml: string;
}

export interface CeleryChip {
  id: string;
  st: string;
  meta?: string;
}

export interface CeleryWorkerBoard {
  n: string;
  conc: number;
  limit: number;
  slots: (CeleryChip | null)[];
  buf: CeleryChip[];
  note?: string;
  bad?: boolean;
  st?: string;
}

export interface CeleryBoardModel {
  kind: "celery-board";
  clock: string;
  badge: string;
  badgeBad?: boolean;
  term?: string;
  queue: CeleryChip[];
  unacked: CeleryChip[];
  workers: CeleryWorkerBoard[];
  done: CeleryChip[];
  on: string[];
}

export type MvccTupleState = "live" | "new" | "dead" | "free";

export interface MvccTuple {
  slot: string | number;
  val: string;
  xmin: string;
  xmax: string;
  state: MvccTupleState;
  sub?: string;
}

export interface MvccTxn {
  id: string;
  st: "active" | "committed" | "idle";
  n?: string;
}

export interface MvccIndexEntry {
  k: string;
  s: string;
  stale?: boolean;
  nw?: boolean;
}

export interface MvccIndex {
  n: string;
  e: MvccIndexEntry[];
}

export interface MvccPageCells {
  live: number;
  pinned: number;
  free: number;
}

export type BtreePageState = "read" | "scan" | "nope" | "write";

export interface BtreeTreeDef {
  name: string;
  root: string;
  ints: [string, string];
  leaves: string[][];
}

export interface BtreeHighlight {
  [leafKey: string]: number[];
}

export interface WalRecord {
  lsn: string;
  k: string;
  st: string;
  sub?: string;
}

export interface WalPage {
  id: string;
  val: string;
  st: string;
  sub?: string;
}

export interface WalMachine {
  name: string;
  memP: WalPage[];
  memW: WalRecord[];
  diskW: WalRecord[];
  diskP: WalPage[];
}

export interface WalClient {
  t: string;
  st: "committed" | "idle" | "";
}

export interface WalReplica {
  level: string;
  stages: [number, number, number];
  ack: number;
  read: boolean;
  down?: boolean;
}

export interface WalModel {
  kind: "wal";
  badge: string;
  bad?: boolean;
  crash?: boolean;
  clients: WalClient[];
  machine?: WalMachine;
  repl?: WalReplica;
}

export interface HttpPipelineNode {
  name: string;
  sub: string;
  mw?: boolean;
}

export interface HttpToken {
  at: string;
  t: string;
  err?: boolean;
  res?: boolean;
}

export interface HttpPipelineModel {
  kind: "http-pipeline";
  order: string[];
  nodes: Record<string, HttpPipelineNode>;
  down: string[];
  up: string[];
  active: string;
  token: HttpToken;
  notes?: Record<string, string>;
  skip?: string[];
  fail?: string[];
  workers?: number[];
  limits?: Record<string, number>;
  clock?: number;
  fired?: string[];
  status?: string;
  statusErr?: boolean;
  banner?: string;
  buffer?: string;
  nginxMaxBody?: string;
}

export interface BtreeModel {
  kind: "btree";
  tree: BtreeTreeDef;
  st: Record<string, BtreePageState>;
  plan: string;
  count: string;
  hl?: BtreeHighlight;
  hlBad?: boolean;
  dim?: boolean;
  probes?: number[];
  probeLabel?: string;
  links?: [number, number][];
  linkBad?: boolean;
  vm?: number[];
  heapAll?: BtreePageState;
  bad?: boolean;
}

export interface MvccModel {
  kind: "mvcc";
  view: "page" | "pages" | "xid";
  txns: MvccTxn[];
  tuples?: MvccTuple[];
  indexes?: MvccIndex[];
  idx?: boolean;
  full?: boolean;
  log?: string;
  badge?: string;
  good?: boolean;
  table?: string;
  cells?: MvccPageCells;
  pages?: number;
  now?: number;
  frozen?: boolean;
  trigger?: boolean;
  danger?: boolean;
  lost?: boolean;
}
export interface ScheduleSegment {
  from: number;
  to: number;
  style: ScheduleStyle;
  label?: string;
}
export interface ScheduleRow {
  id: string;
  label: string;
  segments: ScheduleSegment[];
}
export interface ScheduleMeter {
  row: string;
  from: number;
  to: number;
  label?: string;
}
export interface ScheduleArrow {
  at: number;
  from: string;
  to: string;
  label: string;
}
export interface SchedulePin {
  at: number;
  row: string;
  label?: string;
}
export interface ScheduleValue {
  at: number;
  text: string;
  note?: string;
  bad?: boolean;
}
// Continuous time from 0 to end; the shape draws only what has happened by now.
export interface ScheduleModel {
  kind: "schedule";
  // Frames with the same track glide from one now to the next; a new track starts from 0.
  track: string;
  end: number;
  now: number;
  tickEvery: number;
  // Faint marks along solid segments at this spacing, e.g. points where a lock could change hands.
  marksEvery: number | null;
  // Suffix on the 0 tick. Null draws the numbers with no suffix; a caption can still sit above them.
  unit: string | null;
  axisLabel: string;
  summary: { label: string; segments: ScheduleSegment[] } | null;
  rows: ScheduleRow[];
  meters: ScheduleMeter[];
  arrows: ScheduleArrow[];
  pins: SchedulePin[];
  values: { label: string; points: ScheduleValue[] } | null;
  // Solid time per row so far, read as "<lead> <now>: <row> <time> (<share>%) … <idle> <rest>".
  share: { lead: string; idle: string } | null;
  note: string | null;
}

export type ArrayTone = "plain" | "good" | "warn" | "accent" | "focus";
export interface ArrayBar {
  value: number;
  tone: ArrayTone;
  // Identity tag such as "a" so equal values can be told apart.
  tag?: string;
  faded?: boolean;
}
export interface ArrayPointer {
  label: string;
  index: number;
  tone?: "accent";
}
// Inclusive index range shaded under the bars.
export interface ArrayZone {
  from: number;
  to: number;
  label: string;
  tone: "good" | "warn" | "plain";
}
export interface ArrayRow {
  label?: string;
  bars: (ArrayBar | null)[];
  indices: string[];
  pointers: ArrayPointer[];
  zones: ArrayZone[];
  // Empty slot outlined as the next one to fill.
  next?: number;
}
export interface ArrayModel {
  kind: "array";
  rows: ArrayRow[];
  // Largest value any row can hold; sets the bar height unit.
  scale: number;
}

export interface HeapNode {
  value: number;
  tone: ArrayTone;
  tag?: string;
}
// A complete binary tree in array order; capacity fixes the layout so nodes never move between frames.
export interface HeapModel {
  kind: "heap";
  // Null is an empty dashed slot.
  nodes: (HeapNode | null)[];
  capacity: number;
  // Pair of indexes whose edge is highlighted.
  lit: [number, number] | null;
  // A node leaving the tree, drawn beside the root with an arrow out.
  leaving: HeapNode | null;
  // The same values as bars with level bands, drawn under the tree as one picture; omitted for a tree alone.
  array?: ArrayModel;
}

export type GraphEdgeState = "plain" | "tree" | "checking" | "skipped" | "consumed" | "flash";
export interface GraphNode {
  id: string;
  label: string;
  // Cell units: node centres run 0..cols across and 0..height down.
  x: number;
  y: number;
  tone: ArrayTone;
  faded?: boolean;
  // Visit order, drawn as a small number on the node.
  order?: number;
  // A per-node value, drawn as a small pill on the node.
  badge?: string;
  // Two-colour fill that overrides the tone.
  side?: "a" | "b";
}
export interface GraphEdge {
  from: string;
  to: string;
  state: GraphEdgeState;
  directed: boolean;
  label?: string;
}
// A faint band across the drawing at one row; dashed when outlined.
export interface GraphRow {
  y: number;
  label?: string;
  outlined?: boolean;
}
export interface GraphModel {
  kind: "graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  rows: GraphRow[];
  cols: number;
  height: number;
  // The run is over: the drawing shows its result.
  settled: boolean;
}

// An item hanging to the right of a slot.
export interface TableNode {
  label: string;
  tone: ArrayTone;
  outlined?: boolean;
}
export interface TableSlot {
  index: string;
  // Marked is drawn hatched with a cross: a slot that was emptied but is still in the way.
  state: "empty" | "filled" | "marked";
  label?: string;
  // Small trailing text on the slot.
  note?: string;
  tone: ArrayTone;
  nodes: TableNode[];
}
// An arc down the side of a list from one slot to another.
export interface TableHop {
  from: number;
  to: number;
  label: string;
  current?: boolean;
}
// A held item with a dashed line to one slot.
export interface TableChip {
  label: string;
  lines: string[];
  to: number | null;
}
export interface TableList {
  title?: string;
  slots: TableSlot[];
  hops: TableHop[];
  // Inclusive slot ranges outlined as one group.
  runs: { from: number; to: number }[];
  // Item widths reserved to the right of every slot, so the layout never moves between frames.
  room: number;
  // Reserve the arc lane.
  lane: boolean;
  faded?: boolean;
  chip: TableChip | null;
}
export interface TableMeter {
  label: string;
  value: number;
  max: number;
  mark: number | null;
  markLabel?: string;
}
// Vertical slot lists, side by side when more than one, with an optional fill meter under them.
export interface TableModel {
  kind: "table";
  lists: TableList[];
  meter: TableMeter | null;
}

export type LeafModel =
  | LinearModel
  | ArrayModel
  | HeapModel
  | GraphModel
  | TableModel
  | HistogramModel
  | RankingModel
  | RingModel
  | LanesModel
  | TimelineModel;
export interface CompositeModel {
  kind: "composite";
  parts: LeafModel[];
}
export type ShapeModel =
  | LeafModel
  | CompositeModel
  | ScheduleModel
  | MvccModel
  | BtreeModel
  | WalModel
  | HttpPipelineModel
  | K8sHubModel
  | K8sServiceModel
  | ResourceGaugesModel
  | DnsCachingModel
  | ConnLadderModel
  | ConnectionPoolModel
  | CacheStampedeModel
  | CeleryBoardModel;

export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "linear" || model.kind === "histogram" ? model.defaultAxis : null;
}

export function resolveAxis(model: ShapeModel, rotated: boolean): Axis | null {
  const axis = defaultAxis(model);
  if (axis === null || !rotated) return axis;
  return axis === "vertical" ? "horizontal" : "vertical";
}

export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  if (model.kind === "ranking") return model.rows.map((r) => r.key);
  if (model.kind === "heap") return model.nodes.flatMap((n) => (n ? [String(n.value)] : []));
  if (model.kind === "graph") return model.nodes.map((n) => n.label);
  if (model.kind === "table")
    return (model.lists[model.lists.length - 1]?.slots ?? []).flatMap((s) => [
      ...(s.label !== undefined && s.state === "filled" ? [s.label] : []),
      ...s.nodes.map((n) => n.label),
    ]);
  if (model.kind === "array")
    return (model.rows[0]?.bars ?? []).flatMap((b) => (b ? [String(b.value)] : []));
  if (
    model.kind === "lanes" ||
    model.kind === "timeline" ||
    model.kind === "schedule" ||
    model.kind === "mvcc" ||
    model.kind === "btree" ||
    model.kind === "wal" ||
    model.kind === "http-pipeline" ||
    model.kind === "k8s-hub" ||
    model.kind === "k8s-service" ||
    model.kind === "resource-gauges" ||
    model.kind === "dns-caching" ||
    model.kind === "conn-ladder" ||
    model.kind === "connection-pool" ||
    model.kind === "cache-stampede" ||
    model.kind === "celery-board"
  )
    return [];
  if (model.kind === "composite") return model.parts.flatMap(modelKeys);
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}

export function timelineLabel(model: TimelineModel, subject: string): string {
  const rows = model.rows.map((r) => {
    const marks = r.marks.map((m) => `tick ${m.at} ${m.title ?? m.tone}`).join(", ");
    return `${r.label ? `${r.label}: ` : ""}${marks || "no marks"}`;
  });
  return `${subject}: ${rows.join("; ")}`;
}
