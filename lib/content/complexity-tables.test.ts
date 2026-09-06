import { describe, expect, it } from "vitest";
import { buildComplexityTables } from "./complexity-tables";

describe("buildComplexityTables", () => {
  it("extracts a complexity table for a known DS article", async () => {
    const tables = await buildComplexityTables();
    const hashTable = tables["data-structures/hash-table"];
    expect(hashTable).toBeDefined();
    expect(hashTable!.columns.length).toBeGreaterThan(0);
    expect(hashTable!.rows.length).toBeGreaterThan(0);
    expect(hashTable!.rows[0]!.operation).toBeTruthy();
  });

  it("keys every entry by the article slug path", async () => {
    const tables = await buildComplexityTables();
    for (const key of Object.keys(tables)) {
      expect(key.startsWith("data-structures/")).toBe(true);
    }
  });

  it("omits DS articles that carry no complexity table without erroring", async () => {
    const tables = await buildComplexityTables();
    expect(typeof tables).toBe("object");
  });
});
