import { parentIndex } from "../core/tree";

export function parentLine(i: number): string {
  if (i <= 0) return "node 0 is the root, so it has no parent";
  return `parent of ${i} = ⌊(${i} − 1) / 2⌋ = ${parentIndex(i)}`;
}

export function childLine(i: number, size: number): string {
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  if (left >= size) return `node ${i} has no children (2·${i}+1 = ${left} is past the end)`;
  if (right >= size) {
    return `child of ${i} = 2·${i}+1 = ${left} (2·${i}+2 = ${right} is past the end)`;
  }
  return `children of ${i} = 2·${i}+1 = ${left} and 2·${i}+2 = ${right}`;
}
