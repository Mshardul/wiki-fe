import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (orig) => {
  const actual = await orig<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      bookmarks: {
        add: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
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
  };
});

let session: { user: { id: string } | null; status: string } = {
  user: { id: "u1" },
  status: "in",
};
vi.mock("./session", () => ({ getSession: () => session }));

import { ApiError, api } from "@/lib/api";
import { getBookmarks } from "./bookmarks";
import { clearCompletions, listCompletions, markCompleted } from "./completions";
import { readOutbox } from "./outbox";
import { addToRecents, getRecents } from "./recents";
import { clearUserDataCache, enqueueSync, flushOutbox, pullAll } from "./sync";

const network = () => new ApiError("NETWORK", "Failed to fetch", 0);
const serverError = () => new ApiError("ERROR", "boom", 503);
const nextTick = () => new Promise((r) => setTimeout(r, 0));

describe("outbox sync", () => {
  beforeEach(() => {
    localStorage.clear();
    session = { user: { id: "u1" }, status: "in" };
  });
  afterEach(() => {
    clearUserDataCache();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("sends a queued write and empties the outbox", async () => {
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await flushOutbox();
    expect(api.completions.add).toHaveBeenCalledWith("dsa", "content/dsa/a.md", expect.any(String));
    expect(readOutbox()).toEqual([]);
  });

  it("replays with the time of the original action, not the retry time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    vi.mocked(api.completions.add).mockRejectedValueOnce(network());
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await nextTick();

    vi.setSystemTime(new Date("2026-03-01T11:00:00.000Z"));
    await flushOutbox();

    expect(api.completions.add).toHaveBeenLastCalledWith(
      "dsa",
      "content/dsa/a.md",
      "2026-03-01T10:00:00.000Z",
    );
  });

  it("keeps a write that failed transiently and sends it on the next flush", async () => {
    vi.mocked(api.completions.add).mockRejectedValueOnce(network());
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await nextTick();
    expect(readOutbox()).toHaveLength(1);

    await flushOutbox();
    expect(readOutbox()).toEqual([]);
    expect(api.completions.add).toHaveBeenCalledTimes(2);
  });

  it("retries on a backoff timer after a transient failure", async () => {
    vi.useFakeTimers();
    vi.mocked(api.completions.add).mockRejectedValueOnce(serverError());
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await vi.advanceTimersByTimeAsync(0);
    expect(readOutbox()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(api.completions.add).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.completions.add).toHaveBeenCalledTimes(2);
    expect(readOutbox()).toEqual([]);
  });

  it("drops a write the server rejects permanently and sends the rest", async () => {
    vi.mocked(api.completions.add).mockRejectedValueOnce(new ApiError("BAD", "no", 400));
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/bad.md" });
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "content/dsa/good.md" });
    await flushOutbox();
    expect(api.completions.add).toHaveBeenCalledTimes(2);
    expect(readOutbox()).toEqual([]);
  });

  it("stops on 401 without retrying and keeps the queue", async () => {
    vi.useFakeTimers();
    vi.mocked(api.bookmarks.add).mockRejectedValue(new ApiError("UNAUTHORIZED", "expired", 401));
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(api.bookmarks.add).toHaveBeenCalledTimes(1);
    expect(readOutbox()).toHaveLength(1);
  });

  it("sends writes in the order they were made", async () => {
    const order: string[] = [];
    vi.mocked(api.bookmarks.add).mockImplementation((_w, p) => {
      order.push(`add:${p}`);
      return Promise.resolve();
    });
    vi.mocked(api.completions.add).mockImplementation((_w, p) => {
      order.push(`done:${p}`);
      return Promise.resolve();
    });
    session = { user: { id: "u1" }, status: "loading" };
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "1" });
    enqueueSync({ kind: "completion.add", wikiId: "dsa", path: "2" });
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "3" });
    session = { user: { id: "u1" }, status: "in" };
    await flushOutbox();
    expect(order).toEqual(["add:1", "done:2", "add:3"]);
  });

  it("does not queue anonymous writes", () => {
    session = { user: null, status: "out" };
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    expect(readOutbox()).toEqual([]);
  });

  it("holds writes made during boot and sends them once the session resolves", async () => {
    session = { user: null, status: "loading" };
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await nextTick();
    expect(api.bookmarks.add).not.toHaveBeenCalled();
    expect(readOutbox()[0]?.owner).toBeNull();

    session = { user: { id: "u1" }, status: "in" };
    await flushOutbox();
    expect(api.bookmarks.add).toHaveBeenCalledTimes(1);
    expect(readOutbox()).toEqual([]);
  });

  it("never replays another account's writes", async () => {
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    await nextTick();
    vi.mocked(api.bookmarks.add).mockClear();
    session = { user: { id: "u1" }, status: "loading" };
    localStorage.setItem(
      "wiki-sync-outbox",
      JSON.stringify([
        {
          kind: "bookmark.add",
          wikiId: "dsa",
          path: "other.md",
          id: "x",
          owner: "someone-else",
          clientTs: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    session = { user: { id: "u1" }, status: "in" };
    await flushOutbox();
    expect(api.bookmarks.add).not.toHaveBeenCalled();
    expect(readOutbox()).toEqual([]);
  });

  it("shares one in-flight flush between concurrent callers", async () => {
    session = { user: { id: "u1" }, status: "loading" };
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    session = { user: { id: "u1" }, status: "in" };
    const [a, b] = await Promise.all([flushOutbox(), flushOutbox()]);
    expect([a, b]).toEqual([true, true]);
    expect(api.bookmarks.add).toHaveBeenCalledTimes(1);
  });

  it("surfaces a non-API error instead of retrying it forever", async () => {
    vi.mocked(api.bookmarks.add).mockRejectedValueOnce(new TypeError("bug"));
    session = { user: { id: "u1" }, status: "loading" };
    enqueueSync({ kind: "bookmark.add", wikiId: "dsa", path: "content/dsa/a.md" });
    session = { user: { id: "u1" }, status: "in" };
    await expect(flushOutbox()).rejects.toThrow("bug");
  });

  it("a synced-domain write updates local synchronously", () => {
    addToRecents({ wikiId: "dsa", path: "content/dsa/y.md", title: "Y", slug: ["y"] });
    expect(JSON.parse(localStorage.getItem("wiki-recents") ?? "[]")[0].title).toBe("Y");
  });
});

describe("pullAll", () => {
  beforeEach(() => {
    localStorage.clear();
    session = { user: { id: "u1" }, status: "in" };
  });
  afterEach(() => {
    clearUserDataCache();
    vi.clearAllMocks();
  });

  it("keeps local state when the server is unreachable", async () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([{ wikiId: "dsa", path: "content/dsa/x.md", title: "X", slug: ["x"] }]),
    );
    addToRecents({ wikiId: "dsa", path: "content/dsa/y.md", title: "Y", slug: ["y"] });
    markCompleted("dsa", "content/dsa/z.md");
    await flushOutbox();
    const down = () => Promise.reject(new Error("Failed to fetch"));
    vi.mocked(api.bookmarks.list).mockImplementationOnce(down);
    vi.mocked(api.recents.list).mockImplementationOnce(down);
    vi.mocked(api.completions.list).mockImplementationOnce(down);

    await pullAll();

    expect(getBookmarks()).toHaveLength(1);
    expect(getRecents()).toHaveLength(1);
    expect(listCompletions("dsa")).toEqual(["content/dsa/z.md"]);
  });

  it("replaces local state with the server's when it answers", async () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([{ wikiId: "dsa", path: "content/dsa/x.md", title: "X", slug: ["x"] }]),
    );
    await pullAll();
    expect(getBookmarks()).toHaveLength(0);
  });

  it("flushes pending writes before pulling", async () => {
    markCompleted("dsa", "content/dsa/z.md");
    await pullAll();
    const sent = vi.mocked(api.completions.add).mock.invocationCallOrder[0] ?? Infinity;
    const pulled = vi.mocked(api.completions.list).mock.invocationCallOrder[0] ?? -Infinity;
    expect(sent).toBeLessThan(pulled);
  });

  it("skips the pull while writes are still pending so they are not overwritten", async () => {
    vi.mocked(api.completions.add).mockRejectedValue(network());
    markCompleted("dsa", "content/dsa/z.md");
    await pullAll();
    expect(api.completions.list).not.toHaveBeenCalled();
    expect(listCompletions("dsa")).toEqual(["content/dsa/z.md"]);
  });

  it("does nothing when logged out", async () => {
    session = { user: null, status: "out" };
    await pullAll();
    expect(api.bookmarks.list).not.toHaveBeenCalled();
  });
});

describe("clearUserDataCache", () => {
  beforeEach(() => {
    localStorage.clear();
    session = { user: { id: "u1" }, status: "in" };
  });
  afterEach(() => vi.clearAllMocks());

  it("wipes the local mirror and the outbox without clearing the server", async () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([{ wikiId: "dsa", path: "content/dsa/x.md", title: "X", slug: ["x"] }]),
    );
    addToRecents({ wikiId: "dsa", path: "content/dsa/y.md", title: "Y", slug: ["y"] });
    vi.mocked(api.recents.add).mockRejectedValueOnce(network());
    clearCompletions("dsa");

    clearUserDataCache();
    await nextTick();

    expect(getBookmarks()).toEqual([]);
    expect(getRecents()).toEqual([]);
    expect(readOutbox()).toEqual([]);
    expect(api.bookmarks.clear).not.toHaveBeenCalled();
    expect(api.recents.clear).not.toHaveBeenCalled();
  });
});
