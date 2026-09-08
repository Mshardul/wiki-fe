import { beforeEach, describe, expect, it, vi } from "vitest";
import { getJSON, getString, setJSON, setString, subscribeKey } from "./local";

describe("lib/storage/local", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips JSON values", () => {
    setJSON("k", { a: 1 });
    expect(getJSON<{ a: number }>("k", { a: 0 })).toEqual({ a: 1 });
  });

  it("returns the fallback on a missing or corrupt value", () => {
    expect(getJSON("missing", "fb")).toBe("fb");
    localStorage.setItem("bad", "{not json");
    expect(getJSON("bad", "fb")).toBe("fb");
  });

  it("round-trips string values", () => {
    setString("s", "hello");
    expect(getString("s")).toBe("hello");
  });

  it("subscribeKey fires on a same-tab set", () => {
    const cb = vi.fn();
    subscribeKey("k", cb);
    setString("k", "v");
    expect(cb).toHaveBeenCalledOnce();
  });

  it("subscribeKey fires on a cross-tab storage event for that key only", () => {
    const cb = vi.fn();
    subscribeKey("k", cb);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "x" }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: "k", newValue: "x" }));
    expect(cb).toHaveBeenCalledOnce();
  });

  it("swallows a setItem failure instead of throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => setString("k", "v")).not.toThrow();
    spy.mockRestore();
  });
});
