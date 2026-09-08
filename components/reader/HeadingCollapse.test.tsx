import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeadingCollapse } from "./HeadingCollapse";

function articleWithSection() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <div class="section">
        <div class="section-title"><h2 id="how-it-works">How it works</h2></div>
        <div class="section-body"><p>body text</p></div>
      </div>
    </article>`;
}

describe("HeadingCollapse", () => {
  it("adds a toggle that collapses the section body and persists", () => {
    articleWithSection();
    render(<HeadingCollapse wikiId="dsa" articlePath="patterns/sliding-window" />);

    const btn = document.querySelector(".heading-collapse-btn") as HTMLButtonElement;
    const body = document.querySelector(".section-body") as HTMLElement;
    expect(body.hidden).toBe(false);

    btn.click();
    expect(body.hidden).toBe(true);
    expect(document.querySelector("h2")?.classList.contains("section--collapsed")).toBe(true);
    expect(
      localStorage.getItem("wiki-heading-collapsed-dsa-patterns-sliding-window-how-it-works"),
    ).toBe("1");
  });

  it("restores the collapsed state on mount", () => {
    localStorage.setItem("wiki-heading-collapsed-dsa-patterns-sliding-window-how-it-works", "1");
    articleWithSection();
    render(<HeadingCollapse wikiId="dsa" articlePath="patterns/sliding-window" />);
    expect((document.querySelector(".section-body") as HTMLElement).hidden).toBe(true);
  });
});
