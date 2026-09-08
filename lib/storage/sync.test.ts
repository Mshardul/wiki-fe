import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];

vi.mock("@/lib/api", () => ({
  api: {
    bookmarks: {
      add: vi.fn(),
      remove: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    recents: {
      list: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    completions: {
      list: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

let status = "in";
vi.mock("./session", () => ({
  getSession: () => ({ user: null, status }),
}));

import { addToRecents } from "./recents";
import { discardBootMutations, flushBootMutations, scheduleSyncMutation } from "./sync";

describe("cache-through sync", () => {
  beforeEach(() => {
    calls.length = 0;
    localStorage.clear();
    status = "in";
  });
  afterEach(() => vi.clearAllMocks());

  it("fires the API write when logged in and never throws into the caller", async () => {
    scheduleSyncMutation("k1", () => Promise.reject(new Error("BE down")));
    scheduleSyncMutation("k2", () => {
      calls.push("ok");
      return Promise.resolve();
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toContain("ok");
  });

  it("serialises writes that share a key", async () => {
    const order: number[] = [];
    scheduleSyncMutation("same", async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    scheduleSyncMutation("same", () => {
      order.push(2);
      return Promise.resolve();
    });
    await new Promise((r) => setTimeout(r, 60));
    expect(order).toEqual([1, 2]);
  });

  it("queues writes during boot and flushes them after", async () => {
    status = "loading";
    scheduleSyncMutation("boot", () => {
      calls.push("boot-write");
      return Promise.resolve();
    });
    expect(calls).not.toContain("boot-write");
    await flushBootMutations();
    expect(calls).toContain("boot-write");
  });

  it("discards boot writes on a failed session probe", async () => {
    status = "loading";
    scheduleSyncMutation("boot", () => {
      calls.push("boot-write");
      return Promise.resolve();
    });
    discardBootMutations();
    await flushBootMutations();
    expect(calls).not.toContain("boot-write");
  });

  it("a synced-domain write updates local synchronously", () => {
    addToRecents({ wikiId: "dsa", path: "content/dsa/y.md", title: "Y", slug: ["y"] });
    expect(JSON.parse(localStorage.getItem("wiki-recents") ?? "[]")[0].title).toBe("Y");
  });
});
