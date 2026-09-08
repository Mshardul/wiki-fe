import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Modal } from "./Modal";
import { closeTopmost } from "./modalRegistry";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <Modal open={open} onClose={() => setOpen(false)} label="Test" backdropClassName="bd">
      <button type="button">inside</button>
    </Modal>
  );
}

describe("Modal", () => {
  it("renders into a portal with dialog semantics and locks body scroll", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "Test" });
    expect(dialog).toBeTruthy();
    expect(document.body.classList.contains("modal-open")).toBe(true);
  });

  it("Escape closes it and releases the scroll lock", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });

  it("backdrop click closes it", () => {
    render(<Harness />);
    fireEvent.mouseDown(document.querySelector(".bd") as Element);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("registers with the modal registry so closeTopmost reaches it", () => {
    render(<Harness />);
    let closed = false;
    act(() => {
      closed = closeTopmost();
    });
    expect(closed).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
