import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { WikiSwitcher } from "./WikiSwitcher";

describe("WikiSwitcher", () => {
  it("lists both verticals and marks the current one active", () => {
    render(<WikiSwitcher open onClose={() => {}} currentVertical="dsa" />);
    const cards = screen.getAllByRole("button");
    expect(cards.length).toBe(2);
    const active = cards.find((c) => c.className.includes("wiki-switcher-card--active"));
    expect(active?.textContent).toContain("Data Structures");
  });

  it("navigates to the vertical on select and closes", () => {
    const onClose = vi.fn();
    render(<WikiSwitcher open onClose={onClose} />);
    fireEvent.click(screen.getByText("System Design"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/system-design/");
  });

  it("renders nothing when closed", () => {
    render(<WikiSwitcher open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
