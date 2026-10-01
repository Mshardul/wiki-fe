import { describe, expect, it } from "vitest";
import { MAX_PICKS, mergeComplexityMatrices, type StructureTable } from "./complexity-matrix";

const arrayTable = {
  columns: ["Time", "Space"],
  rows: [
    { operation: "Access", values: { Time: "O(1)", Space: "O(1)" } },
    { operation: "Search", values: { Time: "O(n)", Space: "O(1)" } },
  ],
};

const hashTable = {
  columns: ["Average", "Worst"],
  rows: [
    { operation: "Search", values: { Average: "O(1)", Worst: "O(n)" } },
    { operation: "Insert", values: { Average: "O(1)", Worst: "O(n)" } },
  ],
};

describe("mergeComplexityMatrices", () => {
  it("merges overlapping + distinct operations across structures", () => {
    const input: StructureTable[] = [
      { title: "Array", table: arrayTable },
      { title: "Hash Table", table: hashTable },
    ];
    const merged = mergeComplexityMatrices(input);

    expect(merged.operations).toEqual(["Access", "Search", "Insert"]);
    expect(merged.structures.map((s) => s.title)).toEqual(["Array", "Hash Table"]);
    expect(merged.cols.map((c) => `${c.structureTitle}:${c.column}`)).toEqual([
      "Array:Time",
      "Array:Space",
      "Hash Table:Average",
      "Hash Table:Worst",
    ]);

    // Shared op present for both; blanks where a structure lacks the op/column.
    expect(merged.cell("Search", "Array", "Time")).toBe("O(n)");
    expect(merged.cell("Search", "Hash Table", "Average")).toBe("O(1)");
    expect(merged.cell("Access", "Hash Table", "Average")).toBe("—");
    expect(merged.cell("Insert", "Array", "Time")).toBe("—");
  });

  it("returns empty when no tables provided", () => {
    const merged = mergeComplexityMatrices([]);
    expect(merged.operations).toEqual([]);
    expect(merged.cols).toEqual([]);
  });
});

describe("MAX_PICKS", () => {
  it("caps picker selection at 4", () => {
    expect(MAX_PICKS).toBe(4);
  });
});
