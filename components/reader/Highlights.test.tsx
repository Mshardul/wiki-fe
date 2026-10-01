import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Highlights, Markers } from "@/lib/storage/highlights";
import { HighlightsIsland } from "./Highlights";

function selectRange(node: Node, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe("HighlightsIsland", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML =
      '<article id="markdown-body" class="markdown-body"><p>hello world</p></article>';
  });

  it("applies a seeded highlight on mount", () => {
    Highlights.add("dsa", "content/dsa/x.md", { start: 0, end: 5, snippet: "hello" });
    render(<HighlightsIsland wikiId="dsa" articlePath="content/dsa/x.md" />);
    const mark = document.querySelector(".wiki-highlight");
    expect(mark?.textContent).toBe("hello");
  });

  it("selecting text and clicking the toolbar highlight button creates + stores a highlight", () => {
    render(<HighlightsIsland wikiId="dsa" articlePath="content/dsa/x.md" />);
    const textNode = document.querySelector("#markdown-body p")?.firstChild as Text;
    selectRange(textNode, 0, 5);
    fireEvent.mouseUp(document.getElementById("markdown-body") as Element);

    const highlightBtn = document.querySelector<HTMLButtonElement>(
      ".highlight-toolbar-btn--highlight",
    );
    expect(highlightBtn).toBeTruthy();
    highlightBtn?.click();

    expect(document.querySelector(".wiki-highlight")?.textContent).toBe("hello");
    expect(Highlights.getAll("dsa", "content/dsa/x.md")).toHaveLength(1);
  });

  it("clicking an existing highlight then Remove deletes it", () => {
    const entry = Highlights.add("dsa", "content/dsa/x.md", { start: 0, end: 5, snippet: "hello" });
    render(<HighlightsIsland wikiId="dsa" articlePath="content/dsa/x.md" />);
    const mark = document.querySelector(".wiki-highlight") as HTMLElement;
    fireEvent.click(mark);
    const removeBtn = document.querySelector<HTMLButtonElement>(".highlight-remove-btn");
    removeBtn?.click();

    expect(document.querySelector(".wiki-highlight")).toBeNull();
    expect(Highlights.getAll("dsa", "content/dsa/x.md")).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ id: entry.id })]),
    );
  });

  it("drops a marker whose snippet no longer matches and toasts", () => {
    Markers.add("dsa", "content/dsa/x.md", { offset: 0, emoji: "🤔", snippet: "nomatch" });
    render(<HighlightsIsland wikiId="dsa" articlePath="content/dsa/x.md" />);

    expect(document.querySelector(".wiki-marker")).toBeNull();
    expect(Markers.getAll("dsa", "content/dsa/x.md")).toHaveLength(0);
  });

  it("applies a seeded marker that still matches", () => {
    Markers.add("dsa", "content/dsa/x.md", { offset: 0, emoji: "💡", snippet: "hello" });
    render(<HighlightsIsland wikiId="dsa" articlePath="content/dsa/x.md" />);

    const badge = document.querySelector(".wiki-marker");
    expect(badge?.getAttribute("data-emoji")).toBe("💡");
  });
});
