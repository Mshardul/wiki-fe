import { describe, expect, it } from "vitest";
import type { FieldSection } from "./fields";
import { stepVariant, variantOptions } from "./variants";

const sections: FieldSection[] = [
  {
    title: "",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Policy",
        param: "p",
        options: [
          { value: "fifo", label: "FIFO" },
          { value: "lru", label: "LRU" },
          { value: "lfu", label: "LFU" },
        ],
      },
    ],
  },
];

describe("variants", () => {
  it("variantOptions reads the chips options of the named field", () => {
    expect(variantOptions(sections, "policy").map((o) => o.value)).toEqual(["fifo", "lru", "lfu"]);
    expect(variantOptions(sections, "missing")).toEqual([]);
  });

  it("stepVariant moves by one and wraps in both directions", () => {
    const ids = ["fifo", "lru", "lfu"];
    expect(stepVariant(ids, "fifo", 1)).toBe("lru");
    expect(stepVariant(ids, "lfu", 1)).toBe("fifo");
    expect(stepVariant(ids, "fifo", -1)).toBe("lfu");
  });

  it("stepVariant starts from the first id when current is unknown and handles an empty list", () => {
    expect(stepVariant(["a", "b"], "zzz", 1)).toBe("b");
    expect(stepVariant([], "x", 1)).toBe("x");
  });
});
