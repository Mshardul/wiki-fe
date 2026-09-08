import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetSessionExpiredGuard, ApiError, api, BACKEND_URL, setSessionToken } from "./api";

describe("api client", () => {
  beforeEach(() => {
    _resetSessionExpiredGuard();
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("targets localhost:8001 under a local host", () => {
    expect(BACKEND_URL).toBe("http://localhost:8001");
  });

  it("sends the bearer token and X-Request-Id header", async () => {
    setSessionToken("tok-123");
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.bookmarks.list();
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("http://localhost:8001/api/v1/bookmarks");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.headers["X-Request-Id"]).toMatch(/[0-9a-f-]{36}/);
  });

  it("throws ApiError with code/status/requestId on a 4xx envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 400,
        ok: false,
        headers: new Headers({ "X-Request-Id": "req-9" }),
        json: () => Promise.resolve({ error: { code: "BAD_INPUT", message: "nope" } }),
      }),
    );
    await expect(api.auth.register("a@example.com", "x")).rejects.toMatchObject({
      name: "ApiError",
      code: "BAD_INPUT",
      status: 400,
      requestId: "req-9",
    });
  });

  it("fires wiki:session-expired once on a 401, then suppresses", async () => {
    setSessionToken("dead");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      }),
    );
    const listener = vi.fn();
    document.addEventListener("wiki:session-expired", listener);

    await expect(api.bookmarks.list()).rejects.toBeInstanceOf(ApiError);
    await expect(api.recents.list()).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledOnce();
    expect(localStorage.getItem("wiki-session-token")).toBeNull();

    document.removeEventListener("wiki:session-expired", listener);
  });

  it("does not fire session-expired for a silent401 endpoint (auth.me / auth.login)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        headers: new Headers(),
        json: () => Promise.resolve({ error: { code: "INVALID_CREDENTIALS" } }),
      }),
    );
    const listener = vi.fn();
    document.addEventListener("wiki:session-expired", listener);
    await expect(api.auth.login("a@example.com", "bad")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(listener).not.toHaveBeenCalled();
    document.removeEventListener("wiki:session-expired", listener);
  });

  it("maps a network failure to ApiError NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api.bookmarks.list()).rejects.toMatchObject({ code: "NETWORK", status: 0 });
  });
});
