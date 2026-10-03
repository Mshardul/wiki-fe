import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  importAll: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  resend: vi.fn(),
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
        resendVerification: mocks.resend,
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
import { anonDataExists, loginFlow, migrateAnonData, registerFlow, resendFlow } from "./authFlows";

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

  it("loginFlow maps EMAIL_NOT_VERIFIED to UNVERIFIED", async () => {
    mocks.login.mockRejectedValue(new ApiError("EMAIL_NOT_VERIFIED", "not verified", 403));
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r).toEqual({ ok: false, code: "UNVERIFIED" });
  });

  it("loginFlow reports a deactivated account instead of asking to verify", async () => {
    mocks.login.mockRejectedValue(
      new ApiError("ACCOUNT_DEACTIVATED", "This account has been deactivated.", 403),
    );
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r).toEqual({
      ok: false,
      code: "ACCOUNT_DEACTIVATED",
      error: "This account has been deactivated.",
    });
  });

  it("loginFlow surfaces any other 403 as an error, not UNVERIFIED", async () => {
    mocks.login.mockRejectedValue(new ApiError("FORBIDDEN", "Not allowed", 403));
    const r = await loginFlow("a@example.com", "pw", true);
    expect(r.code).toBeUndefined();
    expect(r.error).toBe("Not allowed");
  });

  it("resendFlow succeeds quietly on a 2xx", async () => {
    mocks.resend.mockResolvedValue(undefined);
    expect(await resendFlow("a@example.com")).toEqual({});
  });

  it.each([
    ["ALREADY_VERIFIED", "This email is already verified.", 400],
    ["USER_NOT_FOUND", "User not found.", 404],
    ["RATE_LIMITED", "Too many requests.", 429],
  ])("resendFlow reports %s honestly", async (code, message, status) => {
    mocks.resend.mockRejectedValue(new ApiError(code, message, status));
    expect(await resendFlow("a@example.com")).toEqual({ error: message });
  });

  it("resendFlow maps a network failure to a friendly message", async () => {
    mocks.resend.mockRejectedValue(new ApiError("NETWORK", "Failed to fetch", 0));
    const r = await resendFlow("a@example.com");
    expect(r.error).toMatch(/Check your connection/);
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
