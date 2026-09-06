import type { Vertical } from "./types";

// Lifted verbatim from js/state.js WIKIS; indexPath is repo-relative without the ./ prefix;
// articleCount is derived from the manifest in Phase 6, not stored here.
const REGISTRY: Omit<Vertical, "articleCount">[] = [
  {
    id: "system-design",
    title: "System Design",
    description:
      "Interview-ready references covering components, algorithms, and end-to-end system walkthroughs.",
    icon: "⚙️",
    color: "#6366f1",
    indexPath: "content/system-design/index.md",
  },
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    description:
      "Interview-ready DSA reference: data structures, algorithms, and the patterns that recognise them.",
    icon: "🧩",
    color: "#10b981",
    indexPath: "content/dsa/index.md",
  },
];

export function verticalRegistry(): Omit<Vertical, "articleCount">[] {
  return REGISTRY;
}
