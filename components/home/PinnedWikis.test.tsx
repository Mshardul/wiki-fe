import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PinnedWikis } from "./PinnedWikis";

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = `
    <div class="wiki-grid">
      <div class="wiki-card-wrap" data-wiki-id="dsa">
        <button class="wiki-card-pin-btn">☆</button>
        <a class="wiki-card"><span class="wiki-card-title">DSA</span></a>
      </div>
      <div class="wiki-card-wrap" data-wiki-id="system-design">
        <button class="wiki-card-pin-btn">☆</button>
        <a class="wiki-card"><span class="wiki-card-title">System Design</span></a>
      </div>
    </div>`;
});

const ids = () =>
  [...document.querySelectorAll(".wiki-card-wrap")].map((w) => (w as HTMLElement).dataset.wikiId);

describe("PinnedWikis", () => {
  it("pinning the second card moves it first and persists", () => {
    render(<PinnedWikis />);
    const secondBtn = document.querySelectorAll(".wiki-card-pin-btn")[1] as HTMLButtonElement;
    fireEvent.click(secondBtn);
    expect(ids()).toEqual(["system-design", "dsa"]);
    expect(JSON.parse(localStorage.getItem("wiki-pinned-wikis") ?? "[]")).toEqual([
      "system-design",
    ]);
    expect(
      (document.querySelector('[data-wiki-id="system-design"] .wiki-card-pin-btn') as HTMLElement)
        .textContent,
    ).toBe("★");
  });

  it("reflects a pre-existing pin on mount", () => {
    localStorage.setItem("wiki-pinned-wikis", '["system-design"]');
    render(<PinnedWikis />);
    expect(ids()).toEqual(["system-design", "dsa"]);
  });
});
