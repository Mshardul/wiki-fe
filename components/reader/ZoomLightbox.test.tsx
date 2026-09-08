import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZoomLightbox } from "./ZoomLightbox";

describe("ZoomLightbox", () => {
  it("opens the overlay with a clone of the clicked image", () => {
    document.body.innerHTML = `
      <article class="markdown-body"><img src="/x.png" alt="a diagram"></article>`;
    render(<ZoomLightbox />);
    const img = document.querySelector(".markdown-body img") as HTMLImageElement;
    expect(img.classList.contains("zoomable-img")).toBe(true);

    fireEvent.click(img);
    const overlay = document.getElementById("zoom-overlay") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(overlay.querySelector(".zoom-overlay-content img")).toBeTruthy();
    expect(overlay.querySelector(".zoom-caption")?.textContent).toBe("a diagram");
  });

  it("closes on backdrop click and Escape", () => {
    document.body.innerHTML = `<article class="markdown-body"><img src="/x.png" alt=""></article>`;
    render(<ZoomLightbox />);
    fireEvent.click(document.querySelector(".markdown-body img") as Element);
    const overlay = document.getElementById("zoom-overlay") as HTMLElement;

    fireEvent.click(overlay.querySelector(".zoom-overlay-backdrop") as Element);
    expect(overlay.classList.contains("hidden")).toBe(true);

    fireEvent.click(document.querySelector(".markdown-body img") as Element);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  it("replaces a broken image with an error placeholder", () => {
    document.body.innerHTML = `<article class="markdown-body"><img src="/missing.png" alt="chart"></article>`;
    render(<ZoomLightbox />);
    fireEvent.error(document.querySelector(".markdown-body img") as Element);
    const ph = document.querySelector(".img-error-placeholder") as HTMLElement;
    expect(ph.getAttribute("aria-label")).toBe("chart");
    expect(ph.querySelector(".img-error-text")?.textContent).toBe("chart");
  });

  it("opens a diagram SVG on click", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <pre class="mermaid" data-mermaid-src="graph TD"><svg><g></g></svg></pre>
      </article>`;
    render(<ZoomLightbox />);
    fireEvent.click(document.querySelector("pre.mermaid svg") as Element);
    const overlay = document.getElementById("zoom-overlay") as HTMLElement;
    expect(overlay.querySelector(".zoom-overlay-content svg.zoom-diagram-svg")).toBeTruthy();
  });
});
