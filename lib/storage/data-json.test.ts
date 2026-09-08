import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _clearDataJsonCache, loadDataJson } from "./data-json";

describe("loadDataJson", () => {
  beforeEach(() => _clearDataJsonCache());
  afterEach(() => vi.restoreAllMocks());

  it("fetches from /wiki-fe/data/<name>.json and validates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ amortized: "avg cost" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const glossary = await loadDataJson("glossary");
    expect(fetchMock).toHaveBeenCalledWith("/wiki-fe/data/glossary.json", expect.anything());
    expect(glossary.amortized).toBe("avg cost");
  });

  it("caches the result across calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);
    await loadDataJson("synonyms");
    await loadDataJson("synonyms");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns the empty default (not throw) on a fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(loadDataJson("glossary")).resolves.toEqual({});
  });

  it("returns the empty default on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadDataJson("shortcuts")).resolves.toEqual({ global: [], content: [] });
  });

  it("returns the empty default when the payload fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve({ array: "not-an-array" }) }),
    );
    await expect(loadDataJson("synonyms")).resolves.toEqual({});
  });
});
