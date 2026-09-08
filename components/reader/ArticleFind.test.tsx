import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleFind } from "./ArticleFind";

function withArticle() {
  document.body.innerHTML = `
    <article class="markdown-body">
      <p>The sliding window pattern. A window slides over the array. Window size varies.</p>
    </article>`;
}

function type(value: string) {
  const input = screen.getByLabelText("Find in article");
  act(() => {
    fireEvent.change(input, { target: { value } });
    vi.advanceTimersByTime(200);
  });
  return input;
}

describe("ArticleFind", () => {
  it("opens on '/' and highlights matches with a count", () => {
    withArticle();
    vi.useFakeTimers();
    render(<ArticleFind />);
    act(() => {
      fireEvent.keyDown(document, { key: "/" });
    });
    type("window");

    expect(document.querySelectorAll("mark.article-find-hit").length).toBe(3);
    expect(screen.getByText("1/3")).toBeTruthy();
    vi.useRealTimers();
  });

  it("cycles matches with next/prev and marks the current one", () => {
    withArticle();
    vi.useFakeTimers();
    render(<ArticleFind />);
    act(() => {
      fireEvent.keyDown(document, { key: "/" });
    });
    const input = type("window");

    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(screen.getByText("2/3")).toBeTruthy();
    expect(document.querySelectorAll(".article-find-hit--current").length).toBe(1);
    vi.useRealTimers();
  });

  it("clears highlights on close", () => {
    withArticle();
    vi.useFakeTimers();
    render(<ArticleFind />);
    act(() => {
      fireEvent.keyDown(document, { key: "/" });
    });
    const input = type("window");
    act(() => {
      fireEvent.keyDown(input, { key: "Escape" });
    });
    expect(document.querySelectorAll("mark.article-find-hit").length).toBe(0);
    vi.useRealTimers();
  });
});
