import { describe, expect, it } from "vitest";
import { badText, fill, keyText, richText } from "./rich";

describe("rich text", () => {
  it("fill turns placeholders into key-toned parts", () => {
    expect(fill("Remove {victim} now", { victim: "C" })).toEqual([
      "Remove ",
      { text: "C", tone: "key" },
      " now",
    ]);
  });

  it("fill leaves unknown placeholders literal", () => {
    expect(fill("Is {key} in {where}?", { key: "A" })).toEqual([
      "Is ",
      { text: "A", tone: "key" },
      " in ",
      "{where}",
      "?",
    ]);
  });

  it("richText flattens parts to plain text", () => {
    expect(richText([keyText("F"), " ", badText("miss"), " — added"])).toBe("F miss — added");
  });
});
