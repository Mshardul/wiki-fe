import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/dsa/a/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { useH1ScrolledPast } from "./useH1ScrolledPast";

function mountH1(bottom: number) {
  const body = document.createElement("article");
  body.id = "markdown-body";
  const h1 = document.createElement("h1");
  h1.getBoundingClientRect = vi.fn(() => ({ top: bottom - 40, bottom }) as DOMRect);
  body.appendChild(h1);
  document.body.appendChild(body);
  return h1;
}

afterEach(() => {
  document.body.innerHTML = "";
  pathname = "/dsa/a/";
});

describe("useH1ScrolledPast", () => {
  it("is false while the H1 is below the topbar", () => {
    mountH1(200);
    const { result } = renderHook(() => useH1ScrolledPast());
    expect(result.current).toBe(false);
  });

  it("turns true once the H1 scrolls under the topbar, and back on scroll up", () => {
    const h1 = mountH1(200);
    const { result } = renderHook(() => useH1ScrolledPast());

    h1.getBoundingClientRect = vi.fn(() => ({ top: -60, bottom: -20 }) as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    h1.getBoundingClientRect = vi.fn(() => ({ top: 100, bottom: 140 }) as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
  });

  it("re-binds to the new article's H1 on client navigation", () => {
    mountH1(-20);
    const { result, rerender } = renderHook(() => useH1ScrolledPast());
    expect(result.current).toBe(true);

    document.body.innerHTML = "";
    mountH1(300);
    pathname = "/dsa/b/";
    rerender();
    expect(result.current).toBe(false);
  });

  it("stays false when the article has no H1", () => {
    const { result } = renderHook(() => useH1ScrolledPast());
    expect(result.current).toBe(false);
  });
});
