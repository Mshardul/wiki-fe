import { beforeEach, describe, expect, it } from "vitest";
import { extractSnippet } from "./snippet";
import { _setSynonyms } from "./synonyms";

describe("extractSnippet", () => {
  beforeEach(() => _setSynonyms({}));

  it("returns the sentence containing the query term, split for highlighting", () => {
    const desc = "A queue is FIFO. A deque allows both ends. Sliding window uses a deque.";
    const s = extractSnippet(desc, "deque");
    expect(s).not.toBeNull();
    expect(s?.match.toLowerCase()).toBe("deque");
    expect(`${s?.before}${s?.match}${s?.after}`).toContain("A deque allows both ends");
  });

  it("falls back to the first sentence when no term matches", () => {
    const s = extractSnippet("First idea here. Second idea.", "nonexistent");
    expect(s?.before.startsWith("First idea")).toBe(true);
  });

  it("returns null for an empty description", () => {
    expect(extractSnippet("", "x")).toBeNull();
  });
});
