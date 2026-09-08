import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "./ScrollToTop";

describe("ScrollToTop", () => {
  it("becomes visible past the scroll threshold and scrolls to top on click", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    render(<ScrollToTop />);
    const btn = screen.getByRole("button", { name: "Scroll to top" });
    expect(btn.className).not.toContain("visible");

    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    fireEvent.scroll(window);
    expect(btn.className).toContain("visible");

    fireEvent.click(btn);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("renders the progress ring that fills as the page scrolls", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    document.documentElement.scrollTop = 500;
    render(<ScrollToTop />);
    fireEvent.scroll(window);
    const fill = document.querySelector(".scroll-top-ring-fill") as SVGCircleElement;
    const circ = 2 * Math.PI * 17;
    // 50% scrolled → half the circumference remaining as dashoffset
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(circ * 0.5, 1);
  });
});
