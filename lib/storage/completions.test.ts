import { beforeEach, describe, expect, it } from "vitest";
import { listAllCompletions, markCompleted } from "./completions";

beforeEach(() => localStorage.clear());

describe("listAllCompletions", () => {
  it("is empty with no completions", () => {
    expect(listAllCompletions()).toEqual([]);
  });

  it("returns completions from every vertical tagged with their wiki id", () => {
    markCompleted("dsa", "content/dsa/a.md");
    markCompleted("system-design", "content/system-design/b.md");
    expect(listAllCompletions()).toEqual(
      expect.arrayContaining([
        { wikiId: "dsa", path: "content/dsa/a.md" },
        { wikiId: "system-design", path: "content/system-design/b.md" },
      ]),
    );
    expect(listAllCompletions()).toHaveLength(2);
  });
});
