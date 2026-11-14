import type { Item } from "./types";

export {
  arrayOf,
  counter,
  countRow,
  type RowOpts,
  rowOf,
} from "../core/array-model";

export const labelOf = (item: Item): string => `${item.value}${item.tag ?? ""}`;

export const scaleOf = (items: Item[], floor = 1): number =>
  Math.max(floor, ...items.map((i) => i.value));
