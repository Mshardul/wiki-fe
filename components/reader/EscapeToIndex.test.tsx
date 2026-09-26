import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { anyOpen } = vi.hoisted(() => ({ anyOpen: vi.fn(() => false) }));
vi.mock("@/components/common/modalRegistry", () => ({ anyOpen }));

import { EscapeToIndex } from "./EscapeToIndex";

beforeEach(() => {
  vi.clearAllMocks();
  anyOpen.mockReturnValue(false);
  document.body.className = "";
  document.body.innerHTML = "";
});

describe("EscapeToIndex", () => {
  it("Escape with nothing open navigates to the vertical index", () => {
    render(<EscapeToIndex verticalId="dsa" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(push).toHaveBeenCalledWith("/dsa/");
  });

  it("does nothing while a modal is open", () => {
    anyOpen.mockReturnValue(true);
    render(<EscapeToIndex verticalId="dsa" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing in focus mode", () => {
    const article = document.createElement("div");
    article.className = "markdown-body focus-mode";
    document.body.appendChild(article);
    render(<EscapeToIndex verticalId="dsa" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing in distraction-free mode", () => {
    document.body.classList.add("distraction-free");
    render(<EscapeToIndex verticalId="dsa" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(push).not.toHaveBeenCalled();
  });

  it("ignores Escape while typing in an input", () => {
    render(<EscapeToIndex verticalId="dsa" />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(push).not.toHaveBeenCalled();
  });
});
