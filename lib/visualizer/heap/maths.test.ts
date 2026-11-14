import { describe, expect, it } from "vitest";
import { childLine, parentLine } from "./maths";

describe("heap maths lines", () => {
  it("parentLine", () => {
    expect(parentLine(3)).toBe("parent of 3 = ⌊(3 − 1) / 2⌋ = 1");
    expect(parentLine(0)).toContain("root");
  });

  it("childLine names only the children that exist", () => {
    expect(childLine(1, 5)).toBe("children of 1 = 2·1+1 = 3 and 2·1+2 = 4");
    expect(childLine(1, 4)).toBe("child of 1 = 2·1+1 = 3 (2·1+2 = 4 is past the end)");
    expect(childLine(3, 5)).toBe("node 3 has no children (2·3+1 = 7 is past the end)");
  });
});
