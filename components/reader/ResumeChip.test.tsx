import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Heading } from "@/lib/content/types";
import { ResumeChip } from "./ResumeChip";

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

describe("ResumeChip", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when there is no saved scroll position", () => {
    setupArticle();
    const { container } = render(
      <ResumeChip wikiId="dsa" articlePath="content/dsa/x.md" headings={HEADINGS} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the user dismissed the chip", () => {
    setupArticle();
    localStorage.setItem("wiki-resume-chip-dismissed-dsa-content-dsa-x.md", "1");
    localStorage.setItem("wiki-toc-scroll-article-dsa-content-dsa-x.md", "600");
    const { container } = render(
      <ResumeChip wikiId="dsa" articlePath="content/dsa/x.md" headings={HEADINGS} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("names the nearest heading above the saved offset", async () => {
    setupArticle();
    localStorage.setItem("wiki-toc-scroll-article-dsa-content-dsa-x.md", "600");

    // jsdom has no layout; emulate the offsets the component reads.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.id === "what-it-is") {
        return {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON() {},
        };
      }
      if (this.id === "how-it-works") {
        return {
          top: 500,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON() {},
        };
      }
      return {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON() {},
      };
    });
    vi.spyOn(window, "scrollY", "get").mockReturnValue(0);

    render(<ResumeChip wikiId="dsa" articlePath="content/dsa/x.md" headings={HEADINGS} />);

    const chip = await screen.findByRole("status");
    expect(chip.textContent).toContain("Resume where you left off");
    expect(chip.textContent).toContain("How it works");
  });

  it("jump scrolls the named heading into view and writes ?a=", async () => {
    setupArticle();
    localStorage.setItem("wiki-toc-scroll-article-dsa-content-dsa-x.md", "600");

    const el = document.getElementById("how-it-works") as HTMLElement;
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;

    render(<ResumeChip wikiId="dsa" articlePath="content/dsa/x.md" headings={HEADINGS} />);

    fireEvent.click(await screen.findByRole("button", { name: "Jump to How it works" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(new URL(location.href).searchParams.get("a")).toBe("how-it-works");
  });

  it("dismiss hides the chip and persists the dismissal", async () => {
    setupArticle();
    localStorage.setItem("wiki-toc-scroll-article-dsa-content-dsa-x.md", "600");

    const el = document.getElementById("how-it-works") as HTMLElement;
    el.scrollIntoView = vi.fn();

    render(<ResumeChip wikiId="dsa" articlePath="content/dsa/x.md" headings={HEADINGS} />);

    fireEvent.click(await screen.findByRole("button", { name: "Dismiss resume chip" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(localStorage.getItem("wiki-resume-chip-dismissed-dsa-content-dsa-x.md")).toBe("1");
  });
});
