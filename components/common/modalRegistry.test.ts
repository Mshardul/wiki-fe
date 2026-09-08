import { beforeEach, describe, expect, it, vi } from "vitest";
import { anyOpen, closeTopmost, markClosed, markOpened, registerModal } from "./modalRegistry";

function mockModal() {
  let open = false;
  return {
    close: vi.fn(() => {
      open = false;
    }),
    isOpen: () => open,
    setOpen: (v: boolean) => {
      open = v;
    },
  };
}

describe("modalRegistry", () => {
  let a: ReturnType<typeof mockModal>;
  let b: ReturnType<typeof mockModal>;
  let unregA: () => void;
  let unregB: () => void;

  beforeEach(() => {
    a = mockModal();
    b = mockModal();
    unregA = registerModal(a);
    unregB = registerModal(b);
    return () => {
      unregA();
      unregB();
    };
  });

  it("anyOpen reflects registered modal state", () => {
    expect(anyOpen()).toBe(false);
    a.setOpen(true);
    expect(anyOpen()).toBe(true);
  });

  it("closeTopmost closes the last-opened modal first", () => {
    a.setOpen(true);
    markOpened(a);
    b.setOpen(true);
    markOpened(b);

    expect(closeTopmost()).toBe(true);
    expect(b.close).toHaveBeenCalledOnce();
    expect(a.close).not.toHaveBeenCalled();

    expect(closeTopmost()).toBe(true);
    expect(a.close).toHaveBeenCalledOnce();
  });

  it("closeTopmost falls back to registration order when the open-stack is empty", () => {
    a.setOpen(true);
    expect(closeTopmost()).toBe(true);
    expect(a.close).toHaveBeenCalledOnce();
  });

  it("closeTopmost returns false when nothing is open", () => {
    expect(closeTopmost()).toBe(false);
  });

  it("markClosed removes a modal from the open-stack", () => {
    a.setOpen(true);
    markOpened(a);
    a.setOpen(false);
    markClosed(a);
    expect(closeTopmost()).toBe(false);
  });
});
