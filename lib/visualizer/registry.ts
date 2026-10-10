export interface VisualizerEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export const VISUALIZERS: VisualizerEntry[] = [
  {
    slug: "eviction-policies",
    title: "Eviction policies",
    description: "LRU, FIFO, LFU and CLOCK — watch what a full cache throws out, step by step.",
    icon: "🗃️",
  },
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    description:
      "Cache-aside, read-through, write-through, write-behind, write-around and refresh-ahead — watch each move data and see where it breaks.",
    icon: "⚡",
  },
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    description:
      "Fixed window, sliding log, sliding counter, token bucket and leaky bucket — one request stream, five ways to say no.",
    icon: "🚦",
  },
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
