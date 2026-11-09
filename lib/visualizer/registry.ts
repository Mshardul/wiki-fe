export type VisualizerKind = "compare" | "mechanism";

export interface VisualizerEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  kind: VisualizerKind;
}

export const VISUALIZERS: VisualizerEntry[] = [
  {
    slug: "eviction-policies",
    title: "Eviction policies",
    description: "LRU, FIFO, LFU and CLOCK — watch what a full cache throws out, step by step.",
    icon: "🗃️",
    kind: "compare",
  },
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    description:
      "Cache-aside, read-through, write-through, write-behind, write-around and refresh-ahead — watch each move data and see where it breaks.",
    icon: "⚡",
    kind: "compare",
  },
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    description:
      "Fixed window, sliding log, sliding counter, token bucket and leaky bucket — one request stream, five ways to say no.",
    icon: "🚦",
    kind: "compare",
  },
  {
    slug: "python-gil",
    title: "Inside the Python GIL",
    description:
      "Step through who holds the lock, then the cases where a CPU thread, a convoy, or a checkpoint breaks it.",
    icon: "🔒",
    kind: "mechanism",
  },
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
