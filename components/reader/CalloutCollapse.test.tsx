import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalloutCollapse } from "./CalloutCollapse";

describe("CalloutCollapse", () => {
  it("adds a Show more toggle to an explicitly-collapsed callout and toggles it", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <blockquote class="callout callout-warning" data-collapsed="true">
          <p><span class="callout-first-line"><span class="callout-icon">⚠️</span>Heads up</span></p>
          <p>lots of detail here</p>
        </blockquote>
      </article>`;
    render(<CalloutCollapse />);

    const bq = document.querySelector("blockquote.callout") as HTMLElement;
    const btn = document.querySelector(".callout-expand-btn") as HTMLButtonElement;
    expect(bq.classList.contains("callout--collapsible")).toBe(true);
    expect(btn.textContent).toBe("Show more");

    btn.click();
    expect(bq.classList.contains("callout--expanded")).toBe(true);
    expect(btn.textContent).toBe("Show less");
  });

  it("leaves a short, non-collapsed callout untouched", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(20);
    document.body.innerHTML = `
      <article class="markdown-body">
        <blockquote class="callout callout-thought"><p>brief</p></blockquote>
      </article>`;
    render(<CalloutCollapse />);
    expect(document.querySelector(".callout-expand-btn")).toBeNull();
    vi.restoreAllMocks();
  });
});
