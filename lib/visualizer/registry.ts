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
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
