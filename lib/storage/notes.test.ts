import { beforeEach, describe, expect, it } from "vitest";
import { Notes } from "./notes";

describe("lib/storage/notes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("set then get round-trips the text", () => {
    Notes.set("dsa", "content/dsa/x.md", "hello notes");
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("hello notes");
  });

  it("get returns empty string when nothing stored", () => {
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("");
  });

  it("setting blank text removes the key instead of storing it", () => {
    Notes.set("dsa", "content/dsa/x.md", "something");
    Notes.set("dsa", "content/dsa/x.md", "   ");
    expect(Notes.get("dsa", "content/dsa/x.md")).toBe("");
    expect(localStorage.getItem("wiki-notes-dsa-content-dsa-x.md")).toBeNull();
  });

  it("is isolated per article path", () => {
    Notes.set("dsa", "content/dsa/a.md", "note a");
    expect(Notes.get("dsa", "content/dsa/b.md")).toBe("");
  });

  it("is isolated per wiki", () => {
    Notes.set("dsa", "content/dsa/x.md", "dsa note");
    expect(Notes.get("system-design", "content/dsa/x.md")).toBe("");
  });
});
