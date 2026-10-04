import { beforeEach, describe, expect, it } from "vitest";
import {
  appendToOutbox,
  clearOutbox,
  discardUnowned,
  type Mutation,
  readOutbox,
  reconcileOwners,
  removeFromOutbox,
} from "./outbox";

const T = "2026-01-01T00:00:00.000Z";
const add = (path: string, wikiId = "dsa"): Mutation => ({ kind: "bookmark.add", wikiId, path });
const remove = (path: string, wikiId = "dsa"): Mutation => ({
  kind: "bookmark.remove",
  wikiId,
  path,
});
const summary = () =>
  readOutbox().map((e) => `${e.kind}:${e.wikiId ?? "*"}:${"path" in e ? e.path : ""}`);

beforeEach(() => localStorage.clear());

describe("outbox coalescing", () => {
  it("keeps entries in the order they were queued", () => {
    appendToOutbox(add("a"), "u1", T);
    appendToOutbox(add("b"), "u1", T);
    expect(summary()).toEqual(["bookmark.add:dsa:a", "bookmark.add:dsa:b"]);
  });

  it("keeps only the newest mutation for the same target", () => {
    appendToOutbox(add("a"), "u1", T);
    appendToOutbox(remove("a"), "u1", T);
    expect(summary()).toEqual(["bookmark.remove:dsa:a"]);
  });

  it("does not merge across domains or wikis", () => {
    appendToOutbox(add("a"), "u1", T);
    appendToOutbox({ kind: "completion.add", wikiId: "dsa", path: "a" }, "u1", T);
    appendToOutbox(add("a", "system-design"), "u1", T);
    expect(readOutbox()).toHaveLength(3);
  });

  it("a clear for the whole domain drops earlier entries of that domain only", () => {
    appendToOutbox(add("a"), "u1", T);
    appendToOutbox({ kind: "completion.add", wikiId: "dsa", path: "a" }, "u1", T);
    appendToOutbox({ kind: "bookmark.clear" }, "u1", T);
    expect(summary()).toEqual(["completion.add:dsa:a", "bookmark.clear:*:"]);
  });

  it("a clear scoped to one wiki leaves other wikis and later adds alone", () => {
    appendToOutbox(add("a", "dsa"), "u1", T);
    appendToOutbox(add("b", "system-design"), "u1", T);
    appendToOutbox({ kind: "bookmark.clear", wikiId: "dsa" }, "u1", T);
    appendToOutbox(add("c", "dsa"), "u1", T);
    expect(summary()).toEqual([
      "bookmark.add:system-design:b",
      "bookmark.clear:dsa:",
      "bookmark.add:dsa:c",
    ]);
  });

  it("stamps the entry with its owner and the time of the action", () => {
    appendToOutbox(add("a"), "u1", T);
    expect(readOutbox()[0]).toMatchObject({ owner: "u1", clientTs: T });
  });
});

describe("outbox maintenance", () => {
  it("removes by id without touching entries another tab appended", () => {
    appendToOutbox(add("a"), "u1", T);
    const [first] = readOutbox();
    appendToOutbox(add("b"), "u1", T);
    removeFromOutbox(first?.id ?? "");
    expect(summary()).toEqual(["bookmark.add:dsa:b"]);
  });

  it("clears the storage key once empty", () => {
    appendToOutbox(add("a"), "u1", T);
    removeFromOutbox(readOutbox()[0]?.id ?? "");
    expect(localStorage.getItem("wiki-sync-outbox")).toBeNull();
  });

  it("reconcile claims unowned entries and drops another account's", () => {
    appendToOutbox(add("a"), null, T);
    appendToOutbox(add("b"), "other", T);
    appendToOutbox(add("c"), "u1", T);
    reconcileOwners("u1");
    expect(summary()).toEqual(["bookmark.add:dsa:a", "bookmark.add:dsa:c"]);
    expect(readOutbox().every((e) => e.owner === "u1")).toBe(true);
  });

  it("discardUnowned keeps owned entries", () => {
    appendToOutbox(add("a"), null, T);
    appendToOutbox(add("b"), "u1", T);
    discardUnowned();
    expect(summary()).toEqual(["bookmark.add:dsa:b"]);
  });

  it("clearOutbox empties everything", () => {
    appendToOutbox(add("a"), "u1", T);
    clearOutbox();
    expect(readOutbox()).toEqual([]);
  });
});
