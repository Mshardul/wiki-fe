import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DistractionFree } from "./DistractionFree";

describe("DistractionFree", () => {
  it("toggles the body class on wiki:toggle-distraction-free and Esc exits", () => {
    render(<DistractionFree />);
    document.dispatchEvent(new CustomEvent("wiki:toggle-distraction-free"));
    expect(document.body.classList.contains("distraction-free")).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.classList.contains("distraction-free")).toBe(false);
  });

  it("clicking the exit button removes the distraction-free class", () => {
    const { container } = render(<DistractionFree />);
    document.dispatchEvent(new CustomEvent("wiki:toggle-distraction-free"));
    expect(document.body.classList.contains("distraction-free")).toBe(true);

    const btn = container.querySelector(".distraction-free-exit-btn") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(document.body.classList.contains("distraction-free")).toBe(false);
  });
});
