// Complete binary tree maths on array indexes; no domain words so BST or segment trees can reuse it.

export const parentIndex = (i: number): number => (i <= 0 ? -1 : Math.floor((i - 1) / 2));

export const levelOf = (i: number): number => Math.floor(Math.log2(i + 1));

export const levelCount = (size: number): number => (size <= 0 ? 0 : levelOf(size - 1) + 1);

export function childIndexes(i: number, size: number): number[] {
  return [2 * i + 1, 2 * i + 2].filter((c) => c < size);
}

export interface LevelRange {
  level: number;
  from: number;
  to: number;
}

// Inclusive index range of each level for a tree of `size` nodes.
export function levelRanges(size: number): LevelRange[] {
  const out: LevelRange[] = [];
  for (let level = 0; 2 ** level - 1 < size; level++) {
    out.push({ level, from: 2 ** level - 1, to: Math.min(size, 2 ** (level + 1) - 1) - 1 });
  }
  return out;
}

// x runs 0..1 across the full tree width, centred in the node's own level slot; y is the level.
export function treeSlot(i: number): { x: number; y: number } {
  const y = levelOf(i);
  const across = 2 ** y;
  return { x: (i + 1 - across + 0.5) / across, y };
}
