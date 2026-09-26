import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { NavTransition } from "./NavTransition";

beforeEach(() => {
  pathname = "/";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-nav-direction");
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("NavTransition", () => {
  it("no signal on the first render", () => {
    render(<NavTransition />);
    expect(document.documentElement.getAttribute("data-nav-direction")).toBeNull();
  });

  it("home → vertical signals forward", () => {
    const { rerender } = render(<NavTransition />);
    pathname = "/dsa/";
    rerender(<NavTransition />);
    expect(document.documentElement.classList.contains("nav-forward")).toBe(true);
    expect(document.documentElement.getAttribute("data-nav-direction")).toBe("forward");
  });

  it("article → vertical signals back and clears after the animation", () => {
    pathname = "/dsa/patterns/x/";
    const { rerender } = render(<NavTransition />);
    pathname = "/dsa/";
    rerender(<NavTransition />);
    expect(document.documentElement.classList.contains("nav-back")).toBe(true);
    vi.advanceTimersByTime(300);
    expect(document.documentElement.classList.contains("nav-back")).toBe(false);
    expect(document.documentElement.getAttribute("data-nav-direction")).toBeNull();
  });
});
