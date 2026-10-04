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

  describe("touch gestures", () => {
    const touches = (...pts: Array<[number, number]>) =>
      pts.map(([clientX, clientY]) => ({ clientX, clientY }));

    function openImage() {
      document.body.innerHTML = `<article class="markdown-body"><img src="/x.png" alt=""></article>`;
      render(<ZoomLightbox />);
      fireEvent.click(document.querySelector(".markdown-body img") as Element);
      const overlay = document.getElementById("zoom-overlay") as HTMLElement;
      const target = overlay.querySelector(".zoom-overlay-content img") as HTMLElement;
      return { overlay, target };
    }

    it("scales the zoomed image with a two-finger spread", () => {
      const { overlay, target } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([100, 100], [200, 100]) });
      fireEvent.touchMove(overlay, { touches: touches([50, 100], [250, 100]) });
      expect(target.style.transform).toContain("scale(2)");
    });

    it("clamps pinch scale to the 4x maximum", () => {
      const { overlay, target } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([100, 100], [110, 100]) });
      fireEvent.touchMove(overlay, { touches: touches([0, 100], [300, 100]) });
      expect(target.style.transform).toContain("scale(4)");
    });

    it("closes on a downward swipe of more than 80px", () => {
      const { overlay } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([150, 100]) });
      fireEvent.touchEnd(overlay, { touches: [], changedTouches: touches([152, 230]) });
      expect(overlay.classList.contains("hidden")).toBe(true);
    });

    it("stays open on a short swipe", () => {
      const { overlay } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([150, 100]) });
      fireEvent.touchEnd(overlay, { touches: [], changedTouches: touches([150, 140]) });
      expect(overlay.classList.contains("hidden")).toBe(false);
    });

    it("stays open when the drag is mostly sideways", () => {
      const { overlay } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([50, 100]) });
      fireEvent.touchEnd(overlay, { touches: [], changedTouches: touches([300, 200]) });
      expect(overlay.classList.contains("hidden")).toBe(false);
    });

    it("does not treat lifting the last finger after a pinch as a dismiss swipe", () => {
      const { overlay } = openImage();
      fireEvent.touchStart(overlay, { touches: touches([100, 100], [200, 100]) });
      fireEvent.touchMove(overlay, { touches: touches([100, 100], [180, 100]) });
      fireEvent.touchEnd(overlay, {
        touches: touches([100, 100]),
        changedTouches: touches([180, 100]),
      });
      fireEvent.touchEnd(overlay, { touches: [], changedTouches: touches([100, 300]) });
      expect(overlay.classList.contains("hidden")).toBe(false);
    });

    it("zooms to 2x on a double tap and resets on the next one", () => {
      const { overlay, target } = openImage();
      const tap = () =>
        fireEvent.touchEnd(overlay, { touches: [], changedTouches: touches([200, 150]) });
      tap();
      tap();
      expect(target.style.transform).toContain("scale(2)");
      tap();
      tap();
      expect(target.style.transform).toContain("scale(1)");
    });
  });
});
