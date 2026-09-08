import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { _clearDataJsonCache } from "@/lib/storage/data-json";
import { HoverPreview } from "./HoverPreview";

afterEach(() => {
  _clearDataJsonCache();
  vi.restoreAllMocks();
});

function withLink() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <p>See <a class="wiki-link-article" href="/dsa/data-structures/array/"
        data-internal-link="dsa/data-structures/array">Array</a>.</p>
    </article>`;
}

describe("HoverPreview", () => {
  it("shows a preview card with title + excerpt on internal-link hover", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            "dsa/data-structures/array": {
              title: "Array",
              excerpt: "A contiguous block of memory.",
            },
          }),
      }),
    );
    withLink();
    vi.useFakeTimers();
    render(<HoverPreview />);
    await vi.runAllTimersAsync();

    const link = document.querySelector("a[data-internal-link]") as HTMLElement;
    fireEvent.mouseOver(link);
    await vi.advanceTimersByTimeAsync(500);

    const card = document.getElementById("hover-preview") as HTMLElement;
    expect(card.classList.contains("hidden")).toBe(false);
    expect(card.textContent).toContain("Array");
    expect(card.textContent).toContain("A contiguous block of memory.");
    vi.useRealTimers();
  });

  it("does nothing for a link with no preview entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );
    withLink();
    vi.useFakeTimers();
    render(<HoverPreview />);
    await vi.runAllTimersAsync();
    fireEvent.mouseOver(document.querySelector("a[data-internal-link]") as Element);
    await vi.advanceTimersByTimeAsync(500);
    expect(document.getElementById("hover-preview")?.classList.contains("visible")).toBe(false);
    vi.useRealTimers();
  });
});
