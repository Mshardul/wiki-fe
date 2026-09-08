import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyNav } from "./KeyNav";

function grid() {
  document.body.innerHTML = `
    <div class="index-sections">
      <section class="index-section">
        <a class="index-card" href="#1" tabindex="0">One</a>
        <a class="index-card" href="#2" tabindex="0">Two</a>
        <a class="index-card" href="#3" tabindex="0">Three</a>
      </section>
    </div>`;
}

describe("KeyNav", () => {
  it("ArrowRight/Down moves focus to the next card, ArrowLeft/Up to the previous", () => {
    grid();
    render(<KeyNav />);
    const cards = [...document.querySelectorAll<HTMLElement>(".index-card")];
    cards[0]!.focus();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(document.activeElement).toBe(cards[1]!);
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cards[2]!);
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(document.activeElement).toBe(cards[1]!);
  });

  it("does nothing when focus is not on a card", () => {
    grid();
    render(<KeyNav />);
    document.body.focus();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(document.activeElement).toBe(document.body);
  });
});
