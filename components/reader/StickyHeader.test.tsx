import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickyHeader } from "./StickyHeader";

function h2(id: string, text: string, top: number) {
  const el = document.createElement("h2");
  el.id = id;
  el.textContent = text;
  el.getBoundingClientRect = vi.fn(
    () => ({ top, bottom: top + 30, left: 0, right: 0, width: 0, height: 30 }) as DOMRect,
  );
  return el;
}

describe("StickyHeader", () => {
  it("labels the section currently scrolled under the topbar", () => {
    const body = document.createElement("article");
    body.className = "markdown-body";
    body.append(
      h2("s1", "Section one", -200),
      h2("s2", "Section two", -20),
      h2("s3", "Section three", 400),
    );
    document.body.appendChild(body);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });

    render(<StickyHeader />);
    fireEvent.scroll(window);

    const banner = document.getElementById("sticky-section-header") as HTMLElement;
    expect(banner.textContent).toBe("Section two");
    expect(banner.className).toContain("visible");
    expect(document.body.classList.contains("sticky-header-visible")).toBe(true);
  });

  it("hides when scrolled above the first section", () => {
    const body = document.createElement("article");
    body.className = "markdown-body";
    body.append(h2("s1", "Section one", 500));
    document.body.appendChild(body);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });

    render(<StickyHeader />);
    fireEvent.scroll(window);

    expect(document.getElementById("sticky-section-header")?.className).not.toContain("visible");
  });
});
