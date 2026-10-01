import { beforeEach, describe, expect, it } from "vitest";
import { Highlights, Markers } from "./highlights";

describe("lib/storage/highlights", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("add then getAll returns the entry", () => {
    const entry = Highlights.add("dsa", "content/dsa/x.md", { start: 10, end: 20, snippet: "abc" });
    expect(Highlights.getAll("dsa", "content/dsa/x.md")).toEqual([entry]);
  });

  it("remove deletes by id", () => {
    const entry = Highlights.add("dsa", "content/dsa/x.md", { start: 0, end: 5, snippet: "ab" });
    Highlights.remove("dsa", "content/dsa/x.md", entry.id);
    expect(Highlights.getAll("dsa", "content/dsa/x.md")).toEqual([]);
  });

  it("is isolated per article path", () => {
    Highlights.add("dsa", "content/dsa/a.md", { start: 0, end: 1, snippet: "a" });
    expect(Highlights.getAll("dsa", "content/dsa/b.md")).toEqual([]);
  });

  it("marker add then getAll returns the entry", () => {
    const entry = Markers.add("dsa", "content/dsa/x.md", { offset: 5, emoji: "🤔", snippet: "hi" });
    expect(Markers.getAll("dsa", "content/dsa/x.md")).toEqual([entry]);
  });

  it("marker remove deletes by id", () => {
    const entry = Markers.add("dsa", "content/dsa/x.md", { offset: 5, emoji: "💡", snippet: "hi" });
    Markers.remove("dsa", "content/dsa/x.md", entry.id);
    expect(Markers.getAll("dsa", "content/dsa/x.md")).toEqual([]);
  });
});
