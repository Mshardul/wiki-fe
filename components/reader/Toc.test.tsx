import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Heading } from "@/lib/content/types";
import { setCollapsed } from "@/lib/storage/collapse";
import { Toc } from "./Toc";

const HEADINGS: Heading[] = [
  { depth: 2, text: "What it is", id: "what-it-is" },
  { depth: 3, text: "Trigger phrases", id: "trigger-phrases" },
  { depth: 2, text: "How it works", id: "how-it-works" },
];

function setupArticle() {
  document.body.innerHTML = `
    <h2 id="what-it-is">What it is</h2>
    <p>body</p>
    <h2 id="how-it-works">How it works</h2>
    <p>body</p>
  `;
}

describe("Toc", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a nested nav from headings with depth classes", () => {
    render(<Toc headings={HEADINGS} wikiId="system-design" articlePath="caching" />);
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
    const { container } = render(
      <Toc headings={[]} wikiId="system-design" articlePath="caching" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("smooth-scrolls to the heading and writes ?a= on click", () => {
    setupArticle();
    const scrollIntoView = vi.fn();
    (document.getElementById("how-it-works") as HTMLElement).scrollIntoView = scrollIntoView;
    render(<Toc headings={HEADINGS} wikiId="system-design" articlePath="caching" />);
    fireEvent.click(screen.getByRole("link", { name: "How it works" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(new URL(location.href).searchParams.get("a")).toBe("how-it-works");
  });

  it("chevron aria-expanded reflects the persisted collapsed state", () => {
    setupArticle();
    act(() => setCollapsed("wiki-heading-collapsed-system-design-caching-what-it-is", true));
    render(<Toc headings={HEADINGS} wikiId="system-design" articlePath="caching" />);

    const groups = document.querySelectorAll(".toc-h2-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.classList.contains("section--collapsed")).toBe(true);
    expect(groups[0]?.querySelector(".toc-group-chevron")?.getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(groups[1]?.classList.contains("section--collapsed")).toBe(false);
    expect(groups[1]?.querySelector(".toc-group-chevron")?.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("clicking a chevron toggles the section and aria-expanded", () => {
    setupArticle();
    render(<Toc headings={HEADINGS} wikiId="system-design" articlePath="caching" />);

    const firstChevron = document.querySelector(".toc-group-chevron") as HTMLButtonElement;
    expect(firstChevron.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(firstChevron);

    const firstGroup = document.querySelector(".toc-h2-group") as HTMLElement;
    expect(firstGroup.classList.contains("section--collapsed")).toBe(true);
    expect(firstChevron.getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem("wiki-heading-collapsed-system-design-caching-what-it-is")).toBe(
      "1",
    );

    fireEvent.click(firstChevron);
    expect(firstGroup.classList.contains("section--collapsed")).toBe(false);
    expect(firstChevron.getAttribute("aria-expanded")).toBe("true");
    expect(
      localStorage.getItem("wiki-heading-collapsed-system-design-caching-what-it-is"),
    ).toBeNull();
  });

  it("stays in sync when the in-content collapse writes the same key", () => {
    setupArticle();
    render(<Toc headings={HEADINGS} wikiId="system-design" articlePath="caching" />);

    const firstGroup = document.querySelector(".toc-h2-group") as HTMLElement;
    const firstChevron = document.querySelector(".toc-group-chevron") as HTMLButtonElement;
    expect(firstChevron.getAttribute("aria-expanded")).toBe("true");

    act(() => setCollapsed("wiki-heading-collapsed-system-design-caching-what-it-is", true));

    expect(firstGroup.classList.contains("section--collapsed")).toBe(true);
    expect(firstChevron.getAttribute("aria-expanded")).toBe("false");
  });
});
