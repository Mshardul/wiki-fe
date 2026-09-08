import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Heading } from "@/lib/content/types";
import { Toc } from "./Toc";

const HEADINGS: Heading[] = [
  { depth: 2, text: "What it is", id: "what-it-is" },
  { depth: 3, text: "Trigger phrases", id: "trigger-phrases" },
  { depth: 2, text: "How it works", id: "how-it-works" },
];

describe("Toc", () => {
  it("renders a nested nav from headings with depth classes", () => {
    render(<Toc headings={HEADINGS} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "What it is",
      "Trigger phrases",
      "How it works",
    ]);
    expect(links[1]?.className).toContain("toc-h3");
    expect(links[0]?.className).toContain("toc-h2");
  });

  it("renders nothing without headings", () => {
    const { container } = render(<Toc headings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("smooth-scrolls to the heading and writes ?a= on click", () => {
    document.body.innerHTML = '<h2 id="how-it-works">How it works</h2>';
    const scrollIntoView = vi.fn();
    (document.getElementById("how-it-works") as HTMLElement).scrollIntoView = scrollIntoView;
    render(<Toc headings={HEADINGS} />);
    fireEvent.click(screen.getByRole("link", { name: "How it works" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(new URL(location.href).searchParams.get("a")).toBe("how-it-works");
  });
});
