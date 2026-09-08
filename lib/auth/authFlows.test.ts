import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  importAll: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  bookmarksAdd: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api", async (orig) => {
  const actual = await orig<typeof import("@/lib/api")>();
  return {
    ...actual,
    setSessionToken: vi.fn(),
    api: {
      ...actual.api,
      auth: {
        ...actual.api.auth,
        login: mocks.login,
        register: mocks.register,
        logout: mocks.logout,
      },
      importAll: mocks.importAll,
      bookmarks: {
        ...actual.api.bookmarks,
        add: mocks.bookmarksAdd,
        list: vi.fn().mockResolvedValue([]),
      },
      recents: { ...actual.api.recents, list: vi.fn().mockResolvedValue([]) },
      completions: { ...actual.api.completions, list: vi.fn().mockResolvedValue([]) },
    },
  };
});

const sessionMock = vi.hoisted(() => ({ setSession: vi.fn(), broadcastSessionChange: vi.fn() }));
vi.mock("@/lib/storage/session", () => ({
  setSession: sessionMock.setSession,
  broadcastSessionChange: sessionMock.broadcastSessionChange,
}));

import { ApiError } from "@/lib/api";
import { anonDataExists, loginFlow, migrateAnonData, registerFlow } from "./authFlows";

describe("authFlows", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.importAll.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("loginFlow success stores session and returns ok", async () => {
    mocks.login.mockResolvedValue({
      user: { id: "1", email: "a@example.com" },
      session_token: "t",
    });
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r.ok).toBe(true);
    expect(sessionMock.setSession).toHaveBeenCalledWith({
      user: { id: "1", email: "a@example.com" },
      status: "in",
    });
  });

  it("loginFlow maps a 403 to UNVERIFIED", async () => {
    mocks.login.mockRejectedValue(new ApiError("UNVERIFIED", "not verified", 403));
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r).toEqual({ ok: false, code: "UNVERIFIED" });
  });

  it("loginFlow maps a NETWORK error to a friendly message", async () => {
    mocks.login.mockRejectedValue(new ApiError("NETWORK", "Failed to fetch", 0));
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Check your connection/);
  });

  it("registerFlow surfaces an ApiError message", async () => {
    mocks.register.mockRejectedValue(
      new ApiError("EMAIL_TAKEN", "That email is already registered", 409),
    );
    const r = await registerFlow("a@example.com", "LongEnough1!xx");
    expect(r).toEqual({ ok: false, error: "That email is already registered" });
  });

  it("anon→login migration uploads local bookmarks + recents", async () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([
        { wikiId: "dsa", path: "content/dsa/x.md", slug: "x", title: "X", wikiTitle: "DSA" },
      ]),
    );
    expect(anonDataExists()).toBe(true);
    const kept = await migrateAnonData(true);
    expect(kept).toBe(true);
    expect(mocks.importAll).toHaveBeenCalledWith(
      expect.objectContaining({ bookmarks: [{ wiki_id: "dsa", path: "content/dsa/x.md" }] }),
    );
  });

  it("migration returns false when the import fails and Keep was chosen", async () => {
    localStorage.setItem(
      "wiki-bookmarks",
      JSON.stringify([
        { wikiId: "dsa", path: "content/dsa/x.md", slug: "x", title: "X", wikiTitle: "DSA" },
      ]),
    );
    mocks.importAll.mockRejectedValue(new Error("BE down"));
    expect(await migrateAnonData(true)).toBe(false);
  });
});
